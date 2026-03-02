package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
)

type errorResponse struct {
	Error string `json:"error"`
}

func readJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return fmt.Errorf("invalid request body: %w", err)
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	buf := &bytes.Buffer{}
	if err := json.NewEncoder(buf).Encode(v); err != nil {
		slog.Error("encode response", "err", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = buf.WriteTo(w)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}

func serverError(w http.ResponseWriter, msg string, err error, attrs ...any) {
	slog.Error(msg, append([]any{"error", err}, attrs...)...)
	writeError(w, http.StatusInternalServerError, msg)
}

func pathParamInt(r *http.Request, key string) (int64, error) {
	raw := r.PathValue(key)
	v, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid path param %q: must be an integer", key)
	}
	return v, nil
}

func queryParam[T string | int | bool](r *http.Request, key string, defaultVal T) (T, error) {
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

func decode[T any](r *http.Request, w http.ResponseWriter) (T, bool) {
	var v T
	if err := readJSON(r, &v); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return v, false
	}
	return v, true
}
