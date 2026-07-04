import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Clients flow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("create a new client", async ({ page }) => {
    await page.getByRole("link", { name: /mijozlar|клиенты|clients/i }).first().click();
    await expect(page).toHaveURL(/\/clients/);

    await page.getByRole("button", { name: /yangi mijoz|новый клиент/i }).click();
    await page.locator("#company_name").fill(`E2E Test ${Date.now()}`);
    await page.getByRole("button", { name: /saqlash|сохранить|save/i }).click();

    await expect(page.getByText(/E2E Test/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Contracts page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("opens contracts list", async ({ page }) => {
    await page.getByRole("link", { name: /kontraktlar|контракты|contracts/i }).first().click();
    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.getByRole("button", { name: /yangi|новый|new/i }).first()).toBeVisible();
  });
});

test.describe("Payments page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("opens payments list", async ({ page }) => {
    await page.getByRole("link", { name: /to'lovlar|платежи|payments/i }).first().click();
    await expect(page).toHaveURL(/\/payments/);
  });
});
