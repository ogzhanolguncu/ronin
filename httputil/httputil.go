package httputil

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"sync"

	"github.com/ogzhanolguncu/ronin/model"
)

var bufPool = sync.Pool{
	New: func() any { return new(bytes.Buffer) },
}

type ErrorResponse struct {
	Error   string            `json:"error"`
	Code    string            `json:"code,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}

const MaxRequestBodySize = 1 << 20 // 1MB

func ReadJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, MaxRequestBodySize)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return fmt.Errorf("invalid request body: %w", err)
	}
	return nil
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	buf := bufPool.Get().(*bytes.Buffer)
	buf.Reset()
	defer bufPool.Put(buf)

	if err := json.NewEncoder(buf).Encode(v); err != nil {
		slog.Error("encode response", "err", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = buf.WriteTo(w)
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	code := statusToCode(status)
	WriteJSON(w, status, ErrorResponse{Error: msg, Code: code})
}

func WriteValidationError(w http.ResponseWriter, field, msg string) {
	WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
		Error:   msg,
		Code:    "validation_error",
		Details: map[string]string{"field": field},
	})
}

func ServerError(w http.ResponseWriter, msg string, err error, attrs ...any) {
	slog.Error(msg, append([]any{"error", err}, attrs...)...)
	WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
		Error: "internal server error",
		Code:  "internal_error",
	})
}

func statusToCode(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "bad_request"
	case http.StatusUnauthorized:
		return "unauthorized"
	case http.StatusNotFound:
		return "not_found"
	case http.StatusConflict:
		return "conflict"
	case http.StatusUnprocessableEntity:
		return "validation_error"
	case http.StatusBadGateway:
		return "bad_gateway"
	default:
		return ""
	}
}

func PathParamInt(r *http.Request, key string) (int64, error) {
	raw := r.PathValue(key)
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid path param %q: must be an integer", key)
	}
	return v, nil
}

func QueryParam[T string | int | bool](r *http.Request, key string, defaultVal T) (T, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return defaultVal, nil
	}

	var (
		result any
		err    error
	)

	switch any(defaultVal).(type) {
	case string:
		result = raw
	case int:
		result, err = strconv.Atoi(raw)
	case bool:
		result, err = strconv.ParseBool(raw)
	}

	if err != nil {
		return defaultVal, fmt.Errorf("invalid query param %q: %w", key, err)
	}
	return result.(T), nil
}

func Decode[T any](r *http.Request, w http.ResponseWriter) (T, bool) {
	var v T
	if err := ReadJSON(r, &v); err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return v, false
	}
	return v, true
}

func PaginationMeta(totalCount, page, limit int) model.PaginationMeta {
	totalPages := max((totalCount+limit-1)/limit, 1)
	return model.PaginationMeta{
		Page:       page,
		TotalPages: totalPages,
		TotalCount: totalCount,
		HasMore:    page < totalPages,
	}
}
