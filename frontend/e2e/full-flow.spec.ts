import { expect, test } from "@playwright/test";
import { isoDate, login, selectRadixOption } from "./helpers";

test.describe("Full business flow", () => {
  test("client → contract → payment", async ({ page }) => {
    test.setTimeout(60_000);

    const companyName = `E2E Flow ${Date.now()}`;
    const contractPrice = "1500000";
    const paymentAmount = "500000";

    await login(page);

    // 1. Create client
    await page.getByRole("link", { name: /mijozlar|клиенты|clients/i }).first().click();
    await expect(page).toHaveURL(/\/clients/);
    await page.getByRole("button", { name: /yangi mijoz|новый клиент/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator("#company_name").fill(companyName);
    await page.getByRole("button", { name: /saqlash|сохранить|save/i }).click();
    await expect(page.getByText(companyName)).toBeVisible({ timeout: 10_000 });

    // 2. Create contract
    await page.getByRole("link", { name: /kontraktlar|контракты|contracts/i }).first().click();
    await expect(page).toHaveURL(/\/contracts/);
    await page.getByRole("button", { name: /yangi kontrakt|новый контракт|new contract/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await selectRadixOption(page, companyName);
    await page.locator("#contract_date").fill(isoDate(0));
    await page.locator('input[type="number"]').first().fill(contractPrice);
    await page.getByRole("button", { name: /saqlash|сохранить|save/i }).click();

    await expect(page.getByText(companyName)).toBeVisible({ timeout: 15_000 });

    // 3. Open client card and record payment
    await page.getByRole("link", { name: companyName }).first().click();
    await expect(page).toHaveURL(/\/clients\/\d+/);

    await page.getByRole("button", { name: /^to'lov$|^платёж$|^payment$/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator("#amount").fill(paymentAmount);
    await page.locator("#paid_at").fill(isoDate(0));
    await page.locator("#note").fill("E2E test payment");
    await page.getByRole("button", { name: /saqlash|сохранить|save/i }).click();

    // 4. Verify payment appears in history
    await expect(page.getByText("E2E test payment")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("cell", { name: "500,000", exact: true }),
    ).toBeVisible();
  });
});
