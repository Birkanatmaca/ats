package transport

import (
	"time"

	transportdomain "ots/backend/internal/domain/transport"
)

func buildServiceLiveStatus(trip *transportdomain.Trip, stopLat, stopLng *float64, now time.Time) *transportdomain.ServiceLiveStatus {
	if trip == nil || trip.Status != transportdomain.TripActive {
		return nil
	}
	status := &transportdomain.ServiceLiveStatus{
		Active:        true,
		StopLatitude:  stopLat,
		StopLongitude: stopLng,
	}
	if trip.LastLocation == nil {
		status.LocationStale = true
		return status
	}
	loc := trip.LastLocation
	status.LastLocationAt = &loc.CapturedAt
	status.SpeedKph = loc.SpeedKPH
	if now.Sub(loc.CapturedAt) > locationStaleAfter*time.Minute {
		status.LocationStale = true
	}
	if stopLat != nil && stopLng != nil {
		distance := haversineKm(loc.Latitude, loc.Longitude, *stopLat, *stopLng)
		status.DistanceKm = &distance
		speed := loc.SpeedKPH
		if speed <= 0 {
			speed = defaultBusSpeedKph
		}
		eta := estimateEtaMinutes(distance, speed)
		status.EtaMinutes = &eta
	}
	return status
}
