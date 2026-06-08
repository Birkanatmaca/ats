package handlers

import (
	"errors"
	"net/http"

	transportapp "ots/backend/internal/app/transport"
	"ots/backend/internal/domain/identity"
	transportdomain "ots/backend/internal/domain/transport"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerTransportRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/services/routes", h.listServiceRoutes)
	mux.HandleFunc("POST /api/v1/services/routes", h.createServiceRoute)
	mux.HandleFunc("GET /api/v1/services/routes/{id}", h.getServiceRoute)
	mux.HandleFunc("PATCH /api/v1/services/routes/{id}", h.updateServiceRoute)
	mux.HandleFunc("POST /api/v1/services/routes/{id}/delay", h.reportServiceRouteDelay)
	mux.HandleFunc("DELETE /api/v1/services/routes/{id}", h.deleteServiceRoute)
	mux.HandleFunc("GET /api/v1/services/vehicles", h.listServiceVehicles)
	mux.HandleFunc("POST /api/v1/services/vehicles", h.createServiceVehicle)
	mux.HandleFunc("PATCH /api/v1/services/vehicles/{id}", h.updateServiceVehicle)
	mux.HandleFunc("GET /api/v1/services/staff", h.listServiceStaff)
	mux.HandleFunc("POST /api/v1/services/staff", h.createServiceStaff)
	mux.HandleFunc("PATCH /api/v1/services/staff/{id}", h.updateServiceStaff)
	mux.HandleFunc("GET /api/v1/services/trips/active", h.listActiveServiceTrips)
	mux.HandleFunc("GET /api/v1/driver/me", h.currentDriverSummary)
	mux.HandleFunc("POST /api/v1/driver/sharing/start", h.startDriverSharing)
	mux.HandleFunc("POST /api/v1/driver/sharing/stop", h.stopDriverSharing)
	mux.HandleFunc("POST /api/v1/driver/trips/{id}/locations", h.recordDriverTripLocation)
	mux.HandleFunc("POST /api/v1/services/assignments", h.assignServiceStudent)
	mux.HandleFunc("PATCH /api/v1/services/assignments/{id}", h.updateServiceAssignment)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/service", h.guardianStudentService)
	mux.HandleFunc("GET /api/v1/guardian/students/{studentId}/service/trip", h.guardianStudentServiceTrip)
}

func (h *Handler) listServiceRoutes(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	routes, err := h.transport.Routes(r.Context(), principal.TenantID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, routes, nil)
}

func (h *Handler) createServiceRoute(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.CreateRouteInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis rota verisi okunamadı.", nil)
		return
	}
	route, err := h.transport.CreateRoute(r.Context(), principal.TenantID, principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, route, nil)
}

func (h *Handler) getServiceRoute(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	route, err := h.transport.Route(r.Context(), principal.TenantID, r.PathValue("id"))
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, route, nil)
}

func (h *Handler) updateServiceRoute(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.UpdateRouteInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis rota güncellemesi okunamadı.", nil)
		return
	}
	route, err := h.transport.UpdateRoute(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, route, nil)
}

func (h *Handler) reportServiceRouteDelay(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.ServiceDelayInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis gecikme verisi okunamadı.", nil)
		return
	}
	result, err := h.transport.ReportRouteDelay(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) deleteServiceRoute(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	if err := h.transport.DeleteRoute(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID); writeTransportError(w, err) {
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listServiceVehicles(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	items, err := h.transport.Vehicles(r.Context(), principal.TenantID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createServiceVehicle(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.CreateVehicleInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis araç verisi okunamadı.", nil)
		return
	}
	item, err := h.transport.CreateVehicle(r.Context(), principal.TenantID, principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateServiceVehicle(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.UpdateVehicleInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis araç güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.transport.UpdateVehicle(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listServiceStaff(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	items, err := h.transport.Staff(r.Context(), principal.TenantID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) createServiceStaff(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.CreateStaffInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis personel verisi okunamadı.", nil)
		return
	}
	item, err := h.transport.CreateStaff(r.Context(), principal.TenantID, principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, item, nil)
}

func (h *Handler) updateServiceStaff(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.UpdateStaffInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis personel güncellemesi okunamadı.", nil)
		return
	}
	item, err := h.transport.UpdateStaff(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) listActiveServiceTrips(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	items, err := h.transport.ActiveTrips(r.Context(), principal.TenantID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) currentDriverSummary(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleDriver)
	if !ok {
		return
	}
	summary, err := h.transport.DriverSummary(r.Context(), principal.TenantID, principal.UserID)
	if errors.Is(err, transportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "DRIVER_NOT_FOUND", "Şoför kaydı bulunamadı.", nil)
		return
	}
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) startDriverSharing(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleDriver)
	if !ok {
		return
	}
	item, err := h.transport.StartDriverSharing(r.Context(), principal.TenantID, principal.UserID, principal.UserID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) stopDriverSharing(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleDriver)
	if !ok {
		return
	}
	item, err := h.transport.StopDriverSharing(r.Context(), principal.TenantID, principal.UserID, principal.UserID)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, item, nil)
}

func (h *Handler) recordDriverTripLocation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipalRole(w, r, identity.RoleDriver)
	if !ok {
		return
	}
	var input transportdomain.TripLocationInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis konum verisi okunamadı.", nil)
		return
	}
	location, err := h.transport.RecordDriverLocation(r.Context(), principal.TenantID, principal.UserID, r.PathValue("id"), input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, location, nil)
}

func (h *Handler) assignServiceStudent(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.AssignmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis atama verisi okunamadı.", nil)
		return
	}
	assignment, err := h.transport.AssignStudent(r.Context(), principal.TenantID, principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, assignment, nil)
}

func (h *Handler) updateServiceAssignment(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireTransportOperator(w, r)
	if !ok {
		return
	}
	var input transportdomain.UpdateAssignmentInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Servis atama güncellemesi okunamadı.", nil)
		return
	}
	assignment, err := h.transport.UpdateAssignment(r.Context(), principal.TenantID, r.PathValue("id"), principal.UserID, input)
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, assignment, nil)
}

func (h *Handler) guardianStudentService(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	summary, err := h.transport.GuardianSummary(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) guardianStudentServiceTrip(w http.ResponseWriter, r *http.Request) {
	principal, ok := requireGuardian(w, r)
	if !ok {
		return
	}
	trip, err := h.transport.GuardianActiveTrip(r.Context(), principal.TenantID, principal.UserID, r.PathValue("studentId"))
	if writeTransportError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, trip, nil)
}

func requireTransportOperator(w http.ResponseWriter, r *http.Request) (identity.Principal, bool) {
	return requirePrincipalRole(w, r, identity.RolePrincipal, identity.RoleSystemAdmin)
}

func writeTransportError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, transportapp.ErrInvalidInput) {
		httpx.WriteError(w, http.StatusBadRequest, "SERVICE_VALIDATION_ERROR", "Servis verisi eksik veya geçersiz.", nil)
		return true
	}
	if errors.Is(err, transportapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu servis bilgisine erişim yetkiniz yok.", nil)
		return true
	}
	if errors.Is(err, transportapp.ErrNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "SERVICE_NOT_FOUND", "Servis kaydı bulunamadı.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "SERVICE_OPERATION_FAILED", "Servis işlemi tamamlanamadı.", nil)
	return true
}
