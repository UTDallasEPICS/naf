export class DistanceCalculator {
  private static EARTH_RADIUS_KM = 6371;

  static milesToKm(miles: number): number {
    return miles * 1.60934;
  }

  static haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = DistanceCalculator.deg2rad(lat2 - lat1);
    const dLon = DistanceCalculator.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(DistanceCalculator.deg2rad(lat1)) *
        Math.cos(DistanceCalculator.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return (
      DistanceCalculator.EARTH_RADIUS_KM *
      (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
    );
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
