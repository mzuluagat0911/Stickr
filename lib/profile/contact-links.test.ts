import { describe, expect, it } from "vitest";

import {
  mailtoHref,
  parseConversationPeerContact,
  telegramHref,
  whatsAppHref,
} from "./contact-links";

describe("parseConversationPeerContact", () => {
  it("acepta payload válido", () => {
    expect(
      parseConversationPeerContact({
        whatsapp: "+573001234567",
        preferred: "whatsapp",
      }),
    ).toEqual({
      whatsapp: "+573001234567",
      preferred: "whatsapp",
    });
  });

  it("rechaza objeto vacío", () => {
    expect(parseConversationPeerContact({})).toBeNull();
  });

  it("rechaza email inválido", () => {
    expect(parseConversationPeerContact({ email: "no-es-email" })).toBeNull();
  });
});

describe("URLs de contacto", () => {
  it("whatsappHref usa dígitos", () => {
    expect(whatsAppHref("+57 300 123 4567")).toBe("https://wa.me/573001234567");
  });

  it("telegramHref codifica y quita @", () => {
    expect(telegramHref("@usuario_test")).toBe("https://t.me/usuario_test");
  });

  it("mailtoHref codifica", () => {
    expect(mailtoHref("a@ejemplo.com")).toBe("mailto:a%40ejemplo.com");
  });
});
