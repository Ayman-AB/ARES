
/**
 * Calculates the approximate surface distance between
 * two geographic points on Mars using the Haversine formula.
 *
 * @returns Distance in kilometers (km).
 */
export function calculateMarsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Mean radius of Mars in kilometers
  const R = 3389.5;

  // Convert degrees to radians
  const toRadians = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
  };

  // Differences between coordinates
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  return R * c;
}
