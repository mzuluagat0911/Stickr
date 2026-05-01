import { expect, test } from "@playwright/test";

test.describe("Álbum", () => {
  test("marcar figuritas y persistir tras recarga", async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    test.skip(
      !email || !password,
      "Definí E2E_EMAIL y E2E_PASSWORD en .env.local para este test.",
    );

    await page.goto("/login");
    await page.locator("#email").fill(email!);
    await page.locator("#password").fill(password!);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/(album|onboarding)/, { timeout: 20000 });

    if (page.url().includes("/onboarding")) {
      test.skip(true, "Completa el onboarding para probar el álbum.");
    }

    await page.goto("/album");
    await expect(page.getByRole("heading", { name: /mi álbum/i })).toBeVisible({
      timeout: 15000,
    });

    for (let n = 1; n <= 10; n++) {
      const id = `PR-INT-${n}`;
      await page.getByTestId(`sticker-cell-${id}`).click();
      await expect(page.getByTestId(`sticker-cell-${id}`)).toHaveAttribute(
        "data-user-state",
        "have",
      );
    }

    await page.reload();
    await expect(page.getByRole("heading", { name: /mi álbum/i })).toBeVisible({
      timeout: 15000,
    });

    for (let n = 1; n <= 10; n++) {
      const id = `PR-INT-${n}`;
      await expect(page.getByTestId(`sticker-cell-${id}`)).toHaveAttribute(
        "data-user-state",
        "have",
      );
    }
  });
});
