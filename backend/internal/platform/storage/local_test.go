package storage

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
)

func TestSaveRejectsExtensionMismatch(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	_, err := store.Save(context.Background(), SaveInput{
		TenantID: "tenant-1",
		Category: "profile",
		FileName: "avatar.pdf",
		Content:  pngFixture(),
	})
	if !errors.Is(err, ErrExtensionMismatch) {
		t.Fatalf("expected ErrExtensionMismatch, got %v", err)
	}
}

func TestSaveAssignsExtensionFromDetectedType(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	meta, err := store.Save(context.Background(), SaveInput{
		TenantID:     "tenant_1",
		Category:     "guidance",
		FileName:     "evidence",
		ResourceType: "guidance_case",
		ResourceID:   "case-1",
		UploadedBy:   "user-1",
		Content:      pdfFixture(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasSuffix(meta.Key, ".pdf") {
		t.Fatalf("expected generated key to end with .pdf, got %s", meta.Key)
	}
	if got := store.KeyTenantID(meta.Key); got != "tenant_1" {
		t.Fatalf("expected tenant id tenant_1, got %s", got)
	}
	storedMeta, found, err := store.Metadata(context.Background(), meta.Key)
	if err != nil {
		t.Fatalf("unexpected metadata error: %v", err)
	}
	if !found {
		t.Fatalf("expected metadata to exist")
	}
	if storedMeta.ResourceType != "guidance_case" || storedMeta.ResourceID != "case-1" {
		t.Fatalf("unexpected metadata resource linkage: %#v", storedMeta)
	}

	items, err := store.ListByResource(context.Background(), "tenant_1", "guidance_case", "case-1")
	if err != nil {
		t.Fatalf("unexpected list error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected one metadata item, got %d", len(items))
	}
}

func TestSaveAcceptsOfficeOpenXMLDocument(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	meta, err := store.Save(context.Background(), SaveInput{
		TenantID:     "tenant_1",
		Category:     "student",
		FileName:     "transkript.docx",
		ResourceType: "student",
		ResourceID:   "student-1",
		UploadedBy:   "user-1",
		Content:      docxFixture(t),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasSuffix(meta.Key, ".docx") {
		t.Fatalf("expected generated key to end with .docx, got %s", meta.Key)
	}
	if meta.ContentType != "application/vnd.openxmlformats-officedocument.wordprocessingml.document" {
		t.Fatalf("unexpected content type: %s", meta.ContentType)
	}
}

func TestSaveRejectsRenamedZipAsOfficeDocument(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	_, err := store.Save(context.Background(), SaveInput{
		TenantID: "tenant_1",
		Category: "student",
		FileName: "fake.docx",
		Content:  zipFixture(t, map[string]string{"payload.txt": "not office"}),
	})
	if !errors.Is(err, ErrUnsupportedContentType) {
		t.Fatalf("expected ErrUnsupportedContentType, got %v", err)
	}
}

func TestListByResourceFilteredByCategory(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	tenantID := "tenant_1"
	resourceType := "guidance_case"
	resourceID := "case-1"

	// Upload 3 files: 2 guidance category, 1 support category
	meta1, _ := store.Save(context.Background(), SaveInput{
		TenantID:     tenantID,
		Category:     "guidance",
		FileName:     "file1.pdf",
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   "user-1",
		Content:      pdfFixture(),
	})

	meta2, _ := store.Save(context.Background(), SaveInput{
		TenantID:     tenantID,
		Category:     "support",
		FileName:     "file2.pdf",
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   "user-1",
		Content:      pdfFixture(),
	})

	meta3, _ := store.Save(context.Background(), SaveInput{
		TenantID:     tenantID,
		Category:     "guidance",
		FileName:     "file3.pdf",
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UploadedBy:   "user-1",
		Content:      pdfFixture(),
	})

	// No filter - should get all 3
	allItems, err := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(allItems) != 3 {
		t.Fatalf("expected 3 items, got %d", len(allItems))
	}

	// Filter by guidance category - should get 2 (meta1 and meta3)
	guidanceItems, err := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Category: "guidance",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(guidanceItems) != 2 {
		t.Fatalf("expected 2 guidance items, got %d", len(guidanceItems))
	}
	if guidanceItems[0].Key != meta3.Key && guidanceItems[1].Key != meta3.Key {
		t.Fatalf("meta3 not found in guidance items")
	}
	if guidanceItems[0].Key != meta1.Key && guidanceItems[1].Key != meta1.Key {
		t.Fatalf("meta1 not found in guidance items")
	}

	// Filter by support category - should get 1
	supportItems, err := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Category: "support",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(supportItems) != 1 {
		t.Fatalf("expected 1 support item, got %d", len(supportItems))
	}
	if supportItems[0].Key != meta2.Key {
		t.Fatalf("unexpected support item key")
	}
}

func TestListByResourcePagination(t *testing.T) {
	store := NewLocal(LocalConfig{BaseDir: t.TempDir(), MaxUploadBytes: 1 << 20})
	tenantID := "tenant_1"
	resourceType := "guidance_case"
	resourceID := "case-1"

	// Upload 5 files
	for i := 0; i < 5; i++ {
		store.Save(context.Background(), SaveInput{
			TenantID:     tenantID,
			Category:     "guidance",
			FileName:     "file.pdf",
			ResourceType: resourceType,
			ResourceID:   resourceID,
			UploadedBy:   "user-1",
			Content:      pdfFixture(),
		})
	}

	// Get all without pagination
	all, _ := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{})
	if len(all) != 5 {
		t.Fatalf("expected 5 items total, got %d", len(all))
	}

	// Get first 2 items
	page1, _ := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Offset: 0,
		Limit:  2,
	})
	if len(page1) != 2 {
		t.Fatalf("expected 2 items in page 1, got %d", len(page1))
	}

	// Get next 2 items
	page2, _ := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Offset: 2,
		Limit:  2,
	})
	if len(page2) != 2 {
		t.Fatalf("expected 2 items in page 2, got %d", len(page2))
	}

	// Get remaining 1 item
	page3, _ := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Offset: 4,
		Limit:  2,
	})
	if len(page3) != 1 {
		t.Fatalf("expected 1 item in page 3, got %d", len(page3))
	}

	// Out of range offset
	empty, _ := store.ListByResourceFiltered(context.Background(), tenantID, resourceType, resourceID, ListFileFilter{
		Offset: 10,
		Limit:  2,
	})
	if len(empty) != 0 {
		t.Fatalf("expected empty result for out-of-range offset, got %d items", len(empty))
	}
}

func pdfFixture() []byte {
	return []byte("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n")
}

func pngFixture() []byte {
	return []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 0}
}

func docxFixture(t *testing.T) []byte {
	t.Helper()
	return zipFixture(t, map[string]string{
		"[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`,
		"word/document.xml":   `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:document>`,
	})
}

func zipFixture(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var buf bytes.Buffer
	writer := zip.NewWriter(&buf)
	for name, content := range files {
		fileWriter, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create zip entry: %v", err)
		}
		if _, err := fileWriter.Write([]byte(content)); err != nil {
			t.Fatalf("write zip entry: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	return buf.Bytes()
}
