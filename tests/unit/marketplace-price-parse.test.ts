import { describe, expect, it } from "vitest";

import { parseMajorPriceToCents } from "@/lib/validations/marketplace";

describe("parseMajorPriceToCents", () => {
  it("parsea enteros simples", () => {
    expect(parseMajorPriceToCents("4200")).toBe(420_000);
    expect(parseMajorPriceToCents("0")).toBe(0);
  });

  it("acepta miles con punto", () => {
    expect(parseMajorPriceToCents("15.000")).toBe(1_500_000);
    expect(parseMajorPriceToCents("1.234.567")).toBe(123_456_700);
  });

  it("coma como decimal", () => {
    expect(parseMajorPriceToCents("4200,5")).toBe(420_050);
    expect(parseMajorPriceToCents("15.000,50")).toBe(1_500_050);
    expect(parseMajorPriceToCents("1.234,5")).toBe(123_450);
  });

  it("punto como decimal solo con 1–2 decimales finales", () => {
    expect(parseMajorPriceToCents("12.5")).toBe(1250);
    expect(parseMajorPriceToCents("1234.50")).toBe(123_450);
  });

  it("rechaza inválidos", () => {
    expect(parseMajorPriceToCents("")).toBeNull();
    expect(parseMajorPriceToCents("abc")).toBeNull();
    expect(parseMajorPriceToCents("12,345")).toBeNull();
  });
});
