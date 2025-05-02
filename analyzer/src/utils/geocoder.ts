import NodeGeocoder, { Geocoder } from "node-geocoder";

const geocoder: Geocoder = NodeGeocoder({
  provider: "openstreetmap",
  limit: 1,
});

export async function getCoordinates(
  location: string
): Promise<{ lat: number; lon: number }> {
  if (!location) return { lat: 0, lon: 0 };

  try {
    const [result] = await geocoder.geocode(location);
    return {
      lat: result?.latitude ?? 0,
      lon: result?.longitude ?? 0,
    };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return { lat: 0, lon: 0 };
  }
}
