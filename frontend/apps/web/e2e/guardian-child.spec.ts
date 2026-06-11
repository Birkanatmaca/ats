import { expect, test } from "@playwright/test";

const guardianEmail = process.env.OTS_TEST_GUARDIAN_EMAIL ?? "veli@atlas.k12.tr";
const guardianPassword = process.env.OTS_TEST_GUARDIAN_PASSWORD ?? "OtsVeli!2026";

test.describe("guardian child smoke", () => {
  test("opens linked child page and guidance sharing section", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(guardianEmail);
    await page.locator('input[type="password"]').fill(guardianPassword);
    await page.getByRole("button", { name: /giriş yap/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.getByRole("link", { name: /öğrencim/i }).click();
    await expect(page.getByRole("heading", { name: /rehberlik paylaşımları/i })).toBeVisible({ timeout: 15_000 });
  });
});
