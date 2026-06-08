import { expect, test } from "@playwright/test";

const teacherEmail = process.env.OTS_TEST_TEACHER_EMAIL ?? "ogretmen@atlas.k12.tr";
const teacherPassword = process.env.OTS_TEST_TEACHER_PASSWORD ?? "OtsOgretmen!2026";

test.describe("ogta.ai teacher smoke", () => {
  test("creates observation draft and confirms action", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(teacherEmail);
    await page.locator('input[type="password"]').fill(teacherPassword);
    await page.getByRole("button", { name: /giriş yap/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.getByRole("button", { name: /ogta\.ai/i }).click();
    await expect(page.getByRole("dialog", { name: /ogta\.ai/i })).toBeVisible();

    const prompt = "Defne Yılmaz adlı öğrenciye dikkat gözlemi eklemeni istiyorum. Derste dikkati dağılıyor.";
    await page.getByRole("textbox", { name: /defne yılmaz.*dikkat gözlemi/i }).fill(prompt);
    await page.getByRole("button", { name: /gönder/i }).click();

    await expect(page.getByText(/onay bekleyen işlem/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /kaydı oluştur/i }).click();
    await expect(page.getByText(/gözlem kaydı oluşturuldu/i)).toBeVisible({ timeout: 20_000 });
  });
});
