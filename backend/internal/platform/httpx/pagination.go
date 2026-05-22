package httpx

import (
	"net/http"
	"strconv"
	"strings"
)

type PageParams struct {
	Query  string
	Page   int
	Limit  int
	Offset int
}

func ParsePageParams(r *http.Request, defaultLimit, maxLimit int) PageParams {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	limit := parsePositiveInt(r.URL.Query().Get("limit"), defaultLimit)
	if limit > maxLimit {
		limit = maxLimit
	}
	if limit < 1 {
		limit = defaultLimit
	}
	if page < 1 {
		page = 1
	}
	return PageParams{
		Query:  q,
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

func parsePositiveInt(raw string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 1 {
		return fallback
	}
	return n
}

type PageResult[T any] struct {
	Items      []T `json:"items"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
}

func NewPageResult[T any](items []T, total, page, limit int) PageResult[T] {
	pages := 0
	if limit > 0 && total > 0 {
		pages = (total + limit - 1) / limit
	}
	return PageResult[T]{
		Items:      items,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: pages,
	}
}
