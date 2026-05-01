import { describe, expect, it } from "vitest";

import {
  applyPrivacyJitter,
  haversineDistanceMeters,
} from "@/lib/geo/privacy-jitter";

describe("privacy-jitter", () => {
  it("desplaza el punto como máximo ~707 m del original (±500 m por eje)", () => {
    const lat = -34.6037;
    const lng = -58.3816;
    const rnd = () => 0.99;
    const j = applyPrivacyJitter(lat, lng, 500, rnd);
    const d = haversineDistanceMeters(lat, lng, j.latitude, j.longitude);
    expect(d).toBeLessThanOrEqual(710);
    expect(d).toBeGreaterThan(400);
  });

  it("con ruido uniforme, la distancia cae casi siempre por debajo de 710 m", () => {
    const lat = 40.4168;
    const lng = -3.7038;
    let max = 0;
    for (let i = 0; i < 300; i++) {
      const j = applyPrivacyJitter(lat, lng, 500, Math.random);
      const d = haversineDistanceMeters(lat, lng, j.latitude, j.longitude);
      max = Math.max(max, d);
      expect(d).toBeLessThanOrEqual(715);
    }
    expect(max).toBeGreaterThan(50);
  });
});
