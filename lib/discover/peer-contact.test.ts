import { describe, expect, it } from "vitest";

import { formatWhatsAppDisplay } from "@/lib/discover/format-whatsapp";

describe("formatWhatsAppDisplay", () => {
  it("formatea E.164 válido", () => {
    const out = formatWhatsAppDisplay("+573001234567");
    expect(out).toMatch(/\+57/);
  });

  it("devuelve el texto si no parsea", () => {
    expect(formatWhatsAppDisplay("abc")).toBe("abc");
  });
});
