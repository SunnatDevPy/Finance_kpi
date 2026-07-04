import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: /kirish|войти|sign in/i }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /kirish|войти|sign in/i }).click();
    await expect(page.locator("[class*='destructive']").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: /kirish|войти|sign in/i }).click();
    await expect(page).toHaveURL("/", { timeout: 15_000 });
  });

  test("can open clients page", async ({ page }) => {
    await page.getByRole("link", { name: /mijozlar|клиенты|clients/i }).first().click();
    await expect(page).toHaveURL(/\/clients/);
  });
});
