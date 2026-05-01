/**
 * Aplica jitter de privacidad en metros al centro de un punto WGS84.
 *
 * **Compromiso de privacidad:** las coordenadas GPS reales del dispositivo
 * nunca deben persistirse. Solo se almacena el resultado de esta función: un
 * punto desplazado de forma **aleatoria e independiente** en el eje norte–sur
 * y este–oeste, cada uno con desplazamiento uniforme en `[-maxMeters, +maxMeters]`.
 * Eso impide reconstruir la posición exacta y difumina la ubicación dentro de
 * un rectángulo de hasta ~`maxMeters * √2` metros respecto al punto real (en el
 * ecuador; hacia los polos la componente este–oeste encoge por `cos(lat)`).
 *
 * La conversión metro ↔ grado usa ~111.32 km por grado de latitud y
 * ~111.32·cos(φ) km por grado de longitud en latitud φ.
 *
 * @param latitude - Grados decimales, WGS84 (solo en memoria; no guardar).
 * @param longitude - Grados decimales, WGS84 (solo en memoria; no guardar).
 * @param maxMeters - Radio característico del jitter (p. ej. 500).
 * @param random - PRNG injectable para tests (default: Math.random).
 * @returns Coordenadas **solo** con jitter, listas para `location_jittered`.
 */
export function applyPrivacyJitter(
  latitude: number,
  longitude: number,
  maxMeters: number,
  random: () => number = Math.random,
): { latitude: number; longitude: number } {
  const dLatM = (random() * 2 - 1) * maxMeters;
  const dLngM = (random() * 2 - 1) * maxMeters;

  const metersPerDegLat = 111_320;
  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLng = 111_320 * Math.cos(latRad);

  const jitterLat = latitude + dLatM / metersPerDegLat;
  const jitterLng = longitude + dLngM / metersPerDegLng;

  return { latitude: jitterLat, longitude: jitterLng };
}

/** Haversine en metros entre dos puntos WGS84 (para tests y mensajes aproximados). */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
