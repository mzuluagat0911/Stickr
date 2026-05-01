import { expect, test } from "@playwright/test";

test.describe("Perfil", () => {
  test("edición de perfil: formulario y guardado (requiere sesión)", async ({
    page,
  }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(
      !email || !password,
      "Definí E2E_EMAIL y E2E_PASSWORD para este test.",
    );

    await page.goto("/login");
    await page.locator("#email").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(album|onboarding|profile)/, { timeout: 25_000 });
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Completá onboarding para el usuario E2E.");
    }

    await page.goto("/profile/edit");
    await expect(
      page.getByRole("heading", { name: /editar perfil/i }),
    ).toBeVisible({ timeout: 15_000 });

    const input = page.locator("#displayName");
    await input.clear();
    await input.fill("E2E Display Name");
    await page.getByRole("button", { name: /guardar cambios/i }).click();
    await expect(
      page.getByText(/perfil actualizado|guardado/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test("geolocalización: botón presente tras login (sin forzar permiso)", async ({
    page,
    context,
  }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!email || !password, "Definí E2E_EMAIL y E2E_PASSWORD.");

    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: -34.6, longitude: -58.38 });

    await page.goto("/login");
    await page.locator("#email").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(album|onboarding)/, { timeout: 25_000 });
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Usuario E2E sin onboarding completo.");
    }

    await page.goto("/profile/edit");
    await expect(
      page.getByRole("button", { name: /actualizar mi ubicación/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
