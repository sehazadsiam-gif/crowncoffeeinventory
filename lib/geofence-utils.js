/**
 * Calculates great-circle distance between two points on Earth using Haversine formula
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity
  const R = 6371000 // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Checks if a coordinate is inside a given geofence zone
 * @param {number} lat
 * @param {number} lon
 * @param {{ latitude: number, longitude: number, radius_m: number }} zone
 * @returns {boolean}
 */
export function isInsideGeofence(lat, lon, zone) {
  if (!zone || !zone.latitude || !zone.longitude) return false
  const dist = getDistanceMeters(lat, lon, zone.latitude, zone.longitude)
  return dist <= (zone.radius_m || 100)
}
