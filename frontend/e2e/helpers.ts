import { expect, test, type Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#username").fill("admin");
  await page.locator("#password").fill("admin123");
  await page.getByRole("button", { name: /kirish|войти|sign in/i }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export async function selectRadixOption(page: Page, optionText: RegExp | string, triggerIndex = 0) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator('[data-slot="select-trigger"]').nth(triggerIndex).click();
  await page.getByRole("option", { name: optionText }).click();
}
