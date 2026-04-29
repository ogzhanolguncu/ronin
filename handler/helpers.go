package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/ogzhanolguncu/ronin/httputil"
	"github.com/ogzhanolguncu/ronin/model"
)

func writeNotFoundOrErr(w http.ResponseWriter, err error, notFoundMsg, errMsg string) {
	if errors.Is(err, sql.ErrNoRows) || errors.Is(err, model.ErrNotFound) {
		httputil.WriteError(w, http.StatusNotFound, notFoundMsg)
		return
	}
	httputil.ServerError(w, errMsg, err)
}
