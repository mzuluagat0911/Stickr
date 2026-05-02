import { describe, expect, it } from "vitest";

import { defaultMarketCurrency } from "@/lib/marketplace/currency";

describe("defaultMarketCurrency", () => {
  it("no lanza si country_code llega como número (PostgREST/JSON)", () => {
    expect(() => defaultMarketCurrency(57 as unknown)).not.toThrow();
    expect(defaultMarketCurrency(57 as unknown)).toBe("USD");
  });

  it("acepta string normal", () => {
    expect(defaultMarketCurrency("CO")).toBe("COP");
    expect(defaultMarketCurrency("ar")).toBe("ARS");
  });
});
