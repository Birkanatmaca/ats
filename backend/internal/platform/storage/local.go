package storage

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

var keyPartRegex = regexp.MustCompile(`^[a-zA-Z0-9/_.-]+$`)

type LocalConfig struct {
	BaseDir        string
	BaseURL        string
	MaxUploadBytes int64
	Registry       FileRegistry
}

type FileRegistry interface {
	SaveFileMeta(ctx context.Context, meta FileMeta) error
	GetFileMeta(ctx context.Context, key string) (FileMeta, bool, error)
	ListFileMetaByResource(ctx context.Context, tenantID, resourceType, resourceID string) ([]FileMeta, error)
}

type SaveInput struct {
	TenantID     string
	Category     string
	FileName     string
	ContentType  string
	ResourceType string
	ResourceID   string
	UploadedBy   string
	Content      []byte
}

type FileMeta struct {
	Key          string    `json:"key"`
	URL          string    `json:"url"`
	SizeBytes    int64     `json:"sizeBytes"`
	ContentType  string    `json:"contentType"`
	Category     string    `json:"category,omitempty"`
	OriginalName string    `json:"originalName,omitempty"`
	ResourceType string    `json:"resourceType,omitempty"`
	ResourceID   string    `json:"resourceId,omitempty"`
	UploadedBy   string    `json:"uploadedBy,omitempty"`
	UploadedAt   time.Time `json:"uploadedAt"`
}

type LocalStore struct {
	baseDir        string
	baseURL        string
	maxUploadBytes int64
	registry       FileRegistry
}

var (
	ErrEmptyContent           = errors.New("empty file content")
	ErrFileTooLarge           = errors.New("file too large")
	ErrUnsupportedContentType = errors.New("unsupported content type")
	ErrExtensionMismatch      = errors.New("file extension does not match content type")
)

var allowedContentTypes = map[string]struct{}{
	"image/jpeg":                    {},
	"image/png":                     {},
	"image/webp":                    {},
	"application/pdf":               {},
	"text/plain":                    {},
	"application/msword":            {},
	"application/vnd.ms-excel":      {},
	"application/vnd.ms-powerpoint": {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   {},
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         {},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {},
}

var contentTypeExtensions = map[string][]string{
	"image/jpeg":                    {".jpg", ".jpeg"},
	"image/png":                     {".png"},
	"image/webp":                    {".webp"},
	"application/pdf":               {".pdf"},
	"text/plain":                    {".txt", ".csv"},
	"application/msword":            {".doc"},
	"application/vnd.ms-excel":      {".xls"},
	"application/vnd.ms-powerpoint": {".ppt"},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   {".docx"},
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         {".xlsx"},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {".pptx"},
}

func NewLocal(config LocalConfig) *LocalStore {
	baseDir := strings.TrimSpace(config.BaseDir)
	if baseDir == "" {
		baseDir = "./uploads"
	}
	max := config.MaxUploadBytes
	if max <= 0 {
		max = 8 << 20
	}
	return &LocalStore{
		baseDir:        baseDir,
		baseURL:        strings.TrimRight(strings.TrimSpace(config.BaseURL), "/"),
		maxUploadBytes: max,
		registry:       config.Registry,
	}
}

func (s *LocalStore) MaxUploadBytes() int64 {
	return s.maxUploadBytes
}

func (s *LocalStore) Save(ctx context.Context, input SaveInput) (FileMeta, error) {
	if len(input.Content) == 0 {
		return FileMeta{}, ErrEmptyContent
	}
	if int64(len(input.Content)) > s.maxUploadBytes {
		return FileMeta{}, ErrFileTooLarge
	}
	contentType, err := resolveContentType(input.FileName, input.Content)
	if err != nil {
		return FileMeta{}, err
	}
	if !isAllowedContentType(contentType) {
		return FileMeta{}, ErrUnsupportedContentType
	}

	ext, err := resolveExtension(input.FileName, contentType)
	if err != nil {
		return FileMeta{}, err
	}

	tenantID := sanitizeToken(input.TenantID, "global")
	category := sanitizeToken(input.Category, "general")
	resourceType := sanitizeToken(input.ResourceType, "")
	resourceID := sanitizeToken(input.ResourceID, "")
	uploadedBy := sanitizeToken(input.UploadedBy, "")
	now := time.Now().UTC()
	key := fmt.Sprintf("%s/%s/%04d/%02d/%s%s", tenantID, category, now.Year(), now.Month(), randomToken(12), ext)

	filePath, err := s.pathForKey(key)
	if err != nil {
		return FileMeta{}, err
	}
	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		return FileMeta{}, err
	}
	if err := os.WriteFile(filePath, input.Content, 0o644); err != nil {
		return FileMeta{}, err
	}
	meta := FileMeta{
		Key:          key,
		URL:          s.publicURL(key),
		SizeBytes:    int64(len(input.Content)),
		ContentType:  contentType,
		Category:     category,
		OriginalName: strings.TrimSpace(input.FileName),
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   uploadedBy,
		UploadedAt:   now,
	}
	if err := s.saveMetadata(filePath, meta); err != nil {
		_ = os.Remove(filePath)
		return FileMeta{}, err
	}
	if s.registry != nil {
		if err := s.registry.SaveFileMeta(ctx, meta); err != nil {
			_ = os.Remove(filePath)
			_ = os.Remove(metadataPath(filePath))
			return FileMeta{}, err
		}
	}

	return meta, nil
}

func (s *LocalStore) ResolvePath(key string) (string, error) {
	return s.pathForKey(key)
}

func (s *LocalStore) KeyTenantID(key string) string {
	parts := strings.Split(strings.Trim(strings.TrimSpace(key), "/"), "/")
	if len(parts) == 0 {
		return ""
	}
	return sanitizeToken(parts[0], "")
}

func (s *LocalStore) Metadata(ctx context.Context, key string) (FileMeta, bool, error) {
	if s.registry != nil {
		meta, found, err := s.registry.GetFileMeta(ctx, key)
		if err == nil && found {
			meta.URL = s.publicURL(meta.Key)
			return meta, true, nil
		}
	}

	filePath, err := s.pathForKey(key)
	if err != nil {
		return FileMeta{}, false, err
	}
	metaPath := metadataPath(filePath)
	content, err := os.ReadFile(metaPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FileMeta{}, false, nil
		}
		return FileMeta{}, false, err
	}
	var meta FileMeta
	if err := json.Unmarshal(content, &meta); err != nil {
		return FileMeta{}, false, err
	}
	if meta.URL == "" {
		meta.URL = s.publicURL(meta.Key)
	}
	return meta, true, nil
}

type ListFileFilter struct {
	Category string
	Offset   int
	Limit    int
}

func (s *LocalStore) ListByResource(ctx context.Context, tenantID, resourceType, resourceID string) ([]FileMeta, error) {
	return s.ListByResourceFiltered(ctx, tenantID, resourceType, resourceID, ListFileFilter{})
}

func (s *LocalStore) ListByResourceFiltered(ctx context.Context, tenantID, resourceType, resourceID string, filter ListFileFilter) ([]FileMeta, error) {
	tenantID = sanitizeToken(tenantID, "")
	resourceType = sanitizeToken(resourceType, "")
	resourceID = sanitizeToken(resourceID, "")
	if tenantID == "" || resourceType == "" || resourceID == "" {
		return []FileMeta{}, nil
	}
	if s.registry != nil {
		items, err := s.registry.ListFileMetaByResource(ctx, tenantID, resourceType, resourceID)
		if err == nil {
			items = filterAndPaginateFiles(items, filter, s)
			return items, nil
		}
	}
	tenantDir := filepath.Join(s.baseDir, filepath.FromSlash(tenantID))
	if _, err := os.Stat(tenantDir); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []FileMeta{}, nil
		}
		return nil, err
	}

	items := make([]FileMeta, 0)
	err := filepath.WalkDir(tenantDir, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".meta.json") {
			return nil
		}
		raw, err := os.ReadFile(p)
		if err != nil {
			return nil
		}
		var meta FileMeta
		if err := json.Unmarshal(raw, &meta); err != nil {
			return nil
		}
		if meta.ResourceType != resourceType || meta.ResourceID != resourceID {
			return nil
		}
		meta.URL = s.publicURL(meta.Key)
		items = append(items, meta)
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].UploadedAt.After(items[j].UploadedAt)
	})
	items = filterAndPaginateFiles(items, filter, s)
	return items, nil
}

func filterAndPaginateFiles(items []FileMeta, filter ListFileFilter, s *LocalStore) []FileMeta {
	filtered := make([]FileMeta, 0, len(items))
	category := strings.TrimSpace(strings.ToLower(filter.Category))
	for _, item := range items {
		if category != "" && item.Category != category {
			continue
		}
		if item.URL == "" {
			item.URL = s.publicURL(item.Key)
		}
		filtered = append(filtered, item)
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}
	if offset >= len(filtered) {
		return []FileMeta{}
	}
	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}
	return filtered[offset:end]
}

func (s *LocalStore) pathForKey(rawKey string) (string, error) {
	key := strings.Trim(strings.TrimSpace(rawKey), "/")
	if key == "" || strings.Contains(key, "..") || !keyPartRegex.MatchString(key) {
		return "", errors.New("invalid file key")
	}
	fullPath := filepath.Join(s.baseDir, filepath.FromSlash(key))
	cleanedBase := filepath.Clean(s.baseDir)
	cleanedPath := filepath.Clean(fullPath)
	if cleanedPath != cleanedBase && !strings.HasPrefix(cleanedPath, cleanedBase+string(os.PathSeparator)) {
		return "", errors.New("invalid file key path")
	}
	return cleanedPath, nil
}

func (s *LocalStore) publicURL(key string) string {
	relative := "/api/v1/files/" + strings.TrimLeft(key, "/")
	if s.baseURL == "" {
		return relative
	}
	return s.baseURL + relative
}

func sanitizeToken(value, fallback string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return fallback
	}
	cleaned := make([]rune, 0, len(value))
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			cleaned = append(cleaned, r)
		}
	}
	if len(cleaned) == 0 {
		return fallback
	}
	return string(cleaned)
}

func normalizeExt(fileName, contentType string, content []byte) string {
	ext := strings.ToLower(strings.TrimSpace(path.Ext(fileName)))
	if ext != "" && len(ext) <= 8 {
		return ext
	}
	ct := strings.TrimSpace(contentType)
	if ct == "" {
		ct = http.DetectContentType(content)
	}
	switch ct {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "application/pdf":
		return ".pdf"
	case "text/plain; charset=utf-8":
		return ".txt"
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return ".docx"
	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
		return ".xlsx"
	case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
		return ".pptx"
	case "application/msword":
		return ".doc"
	case "application/vnd.ms-excel":
		return ".xls"
	case "application/vnd.ms-powerpoint":
		return ".ppt"
	default:
		return ".bin"
	}
}

func randomToken(bytesLen int) string {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		now := time.Now().UnixNano()
		return fmt.Sprintf("%x", now)
	}
	return hex.EncodeToString(buf)
}

func isAllowedContentType(contentType string) bool {
	contentType = normalizeContentType(contentType)
	_, ok := allowedContentTypes[contentType]
	return ok
}

func normalizeContentType(contentType string) string {
	contentType = strings.TrimSpace(strings.ToLower(contentType))
	if semi := strings.Index(contentType, ";"); semi >= 0 {
		contentType = strings.TrimSpace(contentType[:semi])
	}
	return contentType
}

func resolveContentType(fileName string, content []byte) (string, error) {
	detected := normalizeContentType(http.DetectContentType(content))
	ext := strings.ToLower(strings.TrimSpace(path.Ext(fileName)))
	if ext == "" {
		return detected, nil
	}
	switch ext {
	case ".docx":
		if isOOXMLDocument(content, "word/") {
			return "application/vnd.openxmlformats-officedocument.wordprocessingml.document", nil
		}
	case ".xlsx":
		if isOOXMLDocument(content, "xl/") {
			return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nil
		}
	case ".pptx":
		if isOOXMLDocument(content, "ppt/") {
			return "application/vnd.openxmlformats-officedocument.presentationml.presentation", nil
		}
	case ".doc":
		if isOLEDocument(content) {
			return "application/msword", nil
		}
	case ".xls":
		if isOLEDocument(content) {
			return "application/vnd.ms-excel", nil
		}
	case ".ppt":
		if isOLEDocument(content) {
			return "application/vnd.ms-powerpoint", nil
		}
	}
	return detected, nil
}

func isOOXMLDocument(content []byte, requiredPrefix string) bool {
	if len(content) < 4 || !bytes.Equal(content[:4], []byte{'P', 'K', 0x03, 0x04}) {
		return false
	}
	reader, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return false
	}
	hasContentTypes := false
	hasDocumentPart := false
	for _, file := range reader.File {
		name := strings.TrimLeft(file.Name, "/")
		if name == "[Content_Types].xml" {
			hasContentTypes = true
		}
		if strings.HasPrefix(name, requiredPrefix) {
			hasDocumentPart = true
		}
		if hasContentTypes && hasDocumentPart {
			return true
		}
	}
	return false
}

func isOLEDocument(content []byte) bool {
	return len(content) >= 8 && bytes.Equal(content[:8], []byte{0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1})
}

func resolveExtension(fileName, contentType string) (string, error) {
	allowedExt := contentTypeExtensions[contentType]
	if len(allowedExt) == 0 {
		return "", ErrUnsupportedContentType
	}
	provided := strings.ToLower(strings.TrimSpace(path.Ext(fileName)))
	if provided == "" {
		return allowedExt[0], nil
	}
	if len(provided) > 8 {
		return "", ErrExtensionMismatch
	}
	for _, ext := range allowedExt {
		if provided == ext {
			return provided, nil
		}
	}
	return "", ErrExtensionMismatch
}

func metadataPath(filePath string) string {
	return filePath + ".meta.json"
}

func (s *LocalStore) saveMetadata(filePath string, meta FileMeta) error {
	raw, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(metadataPath(filePath), raw, 0o644)
}
