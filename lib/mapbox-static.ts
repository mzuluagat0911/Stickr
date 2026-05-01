/**
 * URL de imagen estática Mapbox centrada en un punto (coordenadas ya jittered).
 * Requiere `NEXT_PUBLIC_MAPBOX_TOKEN` en runtime.
 */
export function mapboxStaticPreviewUrl(
  latitude: number,
  longitude: number,
  accessToken: string,
  options?: { width?: number; height?: number; zoom?: number },
): string | null {
  if (!accessToken) return null;
  const w = options?.width ?? 600;
  const h = options?.height ?? 280;
  const zoom = options?.zoom ?? 11;
  const pin = `pin-s+2563eb(${longitude},${latitude})`;
  const base = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static`;
  const path = `${encodeURIComponent(pin)}/${longitude},${latitude},${zoom},0/${w}x${h}@2x`;
  return `${base}/${path}?access_token=${encodeURIComponent(accessToken)}`;
}
