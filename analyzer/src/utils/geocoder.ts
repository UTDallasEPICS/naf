import NodeGeocoder, { Geocoder } from "node-geocoder";

const geocoder: Geocoder = NodeGeocoder({
  provider: "openstreetmap",
  // Remove the limit parameter as it's not supported by OpenStreetMap
});

export async function getCoordinates(
  location: string
): Promise<{ lat: number; lon: number }> {
  if (!location) return { lat: 0, lon: 0 };

  try {
    const results = await geocoder.geocode(location);
    const result = results[0]; // Take first result manually

    if (!result) {
      return { lat: 0, lon: 0 };
    }

    // Additional validation for US locations if needed
    if (
      result.country &&
      !result.country.toLowerCase().includes("united states")
    ) {
      return { lat: 0, lon: 0 };
    }

    return {
      lat: result.latitude ?? 0,
      lon: result.longitude ?? 0,
    };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return { lat: 0, lon: 0 };
  }
}
