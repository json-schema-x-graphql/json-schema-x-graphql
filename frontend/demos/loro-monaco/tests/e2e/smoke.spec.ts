import { test, expect } from "@playwright/test";

test.describe("Editor Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app to fully load
    await page.waitForSelector("h1", { timeout: 5000 });
  });

  test("should load the application", async ({ page }) => {
    const title = await page.locator("h1").first().textContent();
    expect(title).toContain("JSON Schema ⇋ GraphQL");
  });

  test("should have the settings button visible", async ({ page }) => {
    const settingsButton = page
      .locator("button")
      .filter({ hasText: "Settings" });
    await expect(settingsButton).toBeVisible();
  });

  test("should have theme toggle button", async ({ page }) => {
    const themeButton = page.locator("button").filter({ hasText: /🌙|☀️/ });
    await expect(themeButton).toBeVisible();
  });

  test("should open settings panel on Settings button click", async ({
    page,
  }) => {
    const settingsButton = page
      .locator("button")
      .filter({ hasText: "Settings" });
    await settingsButton.click();

    // Wait for the settings panel to appear - look for heading or label
    const settingsPanel = page.locator("text=Converter Settings");
    await expect(settingsPanel).toBeVisible({ timeout: 3000 });
  });

  test("should close settings panel with Done button", async ({ page }) => {
    const settingsButton = page
      .locator("button")
      .filter({ hasText: "Settings" });
    await settingsButton.click();

    // Wait for Done button and click it
    const doneButton = page.locator("button").filter({ hasText: "Done" });
    await expect(doneButton).toBeVisible({ timeout: 3000 });
    await doneButton.click();

    // Settings panel should be hidden
    const settingsPanel = page.locator("text=Converter Settings");
    await expect(settingsPanel).toBeHidden({ timeout: 3000 });
  });
});

test.describe("Settings Panel Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("h1", { timeout: 5000 });

    // Open settings
    const settingsButton = page
      .locator("button")
      .filter({ hasText: "Settings" });
    await settingsButton.click();
    await page.waitForSelector("text=Converter Settings");
  });

  test("should toggle validation option", async ({ page }) => {
    const validateCheckbox = page.locator('input[type="checkbox"]').first();
    const isChecked = await validateCheckbox.isChecked();

    await validateCheckbox.click();
    const newCheckedState = await validateCheckbox.isChecked();

    expect(newCheckedState).not.toBe(isChecked);
  });

  test("should change federation version", async ({ page }) => {
    const federationSelect = page.locator("select").first();
    await federationSelect.selectOption("V1");

    const selectedValue = await federationSelect.inputValue();
    expect(selectedValue).toBe("V1");
  });

  test("should change ID strategy", async ({ page }) => {
    // Find the ID strategy select (usually the 2nd select in the form)
    const selects = page.locator("select");
    const idStrategySelect = selects.nth(2); // Skip federation and naming convention

    await idStrategySelect.selectOption("ALL_STRINGS");
    const selectedValue = await idStrategySelect.inputValue();
    expect(selectedValue).toBe("ALL_STRINGS");
  });

  test("should change output format", async ({ page }) => {
    // Find the output format select
    const selects = page.locator("select");
    const outputSelect = selects.nth(3); // Last select

    await outputSelect.selectOption("AST_JSON");
    const selectedValue = await outputSelect.inputValue();
    expect(selectedValue).toBe("AST_JSON");
  });
});

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("h1", { timeout: 5000 });
  });

  test("should open settings with Ctrl+K", async ({ page }) => {
    await page.keyboard.press("Control+K");

    // Wait for settings panel
    const settingsPanel = page.locator("text=Converter Settings");
    await expect(settingsPanel).toBeVisible({ timeout: 3000 });
  });

  test("should close settings with Escape", async ({ page }) => {
    // Open settings first
    const settingsButton = page
      .locator("button")
      .filter({ hasText: "Settings" });
    await settingsButton.click();

    // Press Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // Settings panel should be hidden
    const settingsPanel = page.locator("text=Converter Settings");
    await expect(settingsPanel).toBeHidden({ timeout: 2000 });
  });

  test("should toggle theme with Ctrl+T", async ({ page }) => {
    const rootElement = page.locator("html");
    const isDarkBefore = await rootElement.evaluate((el) =>
      el.classList.contains("dark"),
    );

    await page.keyboard.press("Control+T");
    await page.waitForTimeout(200); // Wait for state update

    const isDarkAfter = await rootElement.evaluate((el) =>
      el.classList.contains("dark"),
    );

    // Theme should have toggled (if it was dark, now should not be, or vice versa)
    expect(isDarkAfter).not.toBe(isDarkBefore);
  });
});

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("h1", { timeout: 5000 });
  });

  test("should have dark theme by default", async ({ page }) => {
    const rootElement = page.locator("html");
    const isDark = await rootElement.evaluate((el) =>
      el.classList.contains("dark"),
    );
    expect(isDark).toBeTruthy();
  });

  test("should persist theme preference after reload", async ({ page }) => {
    // Toggle to light theme
    const themeButton = page.locator("button").filter({ hasText: /🌙|☀️/ });
    await themeButton.click();
    await page.waitForTimeout(200);

    // Reload page
    await page.reload();
    await page.waitForSelector("h1", { timeout: 5000 });

    // Check that light theme is persisted
    const isDark = await page
      .locator("html")
      .evaluate((el) => el.classList.contains("dark"));
    expect(isDark).toBeFalsy();
  });
});
