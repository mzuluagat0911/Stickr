import { expect, test } from "@playwright/test";

test.describe("Autenticación", () => {
  test("la página de login muestra el formulario", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /iniciar sesión/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apple" })).toBeVisible();
  });

  /**
   * Flujo completo contra un proyecto Supabase real.
   * Requiere:
   * - Usuario ya registrado y email confirmado (o confirmación desactivada en Auth).
   * - Perfil con onboarding_completed = true y username = E2E_USERNAME.
   *
   * El paso "signup → confirm email (mock)" depende de la config del proyecto;
   * si tenés confirmación obligatoria, usá un usuario seed o Inbucket y omití el mock aquí.
   */
  test("login → header con usuario → logout", async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    const username = process.env.E2E_USERNAME;

    test.skip(
      !email || !password || !username,
      "Definí E2E_EMAIL, E2E_PASSWORD y E2E_USERNAME en .env.local para este test.",
    );

    await page.goto("/login");
    await page.locator("#email").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: /entrar/i }).click();

    await page.waitForURL(/\/(album|onboarding)/, { timeout: 20000 });

    if (page.url().includes("/onboarding")) {
      test.skip(
        true,
        "E2E_USERNAME requiere onboarding ya completado para validar header.",
      );
    }

    await expect(
      page.getByText(username!, { exact: false }).first(),
    ).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("menuitem", { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
  });

  test.describe.skip("signup + confirmación de email (mock)", () => {
    test("pendiente: requiere desactivar confirmación en dev o mock de Mailpit/Inbucket", async () => {
      // Documentado para Fase 4 / entorno de staging con email de prueba.
    });
  });
});
