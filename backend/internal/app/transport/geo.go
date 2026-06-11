package transport

import "math"

const (
	earthRadiusKm      = 6371.0
	defaultBusSpeedKph = 25.0
	locationStaleAfter = 5 // minutes
)

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	rad := math.Pi / 180
	dLat := (lat2 - lat1) * rad
	dLon := (lon2 - lon1) * rad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*rad)*math.Cos(lat2*rad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}

func estimateEtaMinutes(distanceKm, speedKph float64) int {
	if distanceKm <= 0 {
		return 0
	}
	if speedKph <= 0 {
		speedKph = defaultBusSpeedKph
	}
	minutes := distanceKm / speedKph * 60
	if minutes < 1 {
		return 1
	}
	return int(math.Round(minutes))
}

func withinProximityKm(lat1, lon1, lat2, lon2, radiusKm float64) bool {
	return haversineKm(lat1, lon1, lat2, lon2) <= radiusKm
}
