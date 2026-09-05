import { test, expect } from "@playwright/test";

/**
 * These checks run without Firebase credentials, so they cover the public
 * surface: the auth guard, the login form's client-side validation, and the
 * mobile layout. Set LOSTLINK_E2E_EMAIL / LOSTLINK_E2E_PASSWORD to also run
 * the signed-in dashboard workflow against the live project.
 */
const email = process.env.LOSTLINK_E2E_EMAIL;
const password = process.env.LOSTLINK_E2E_PASSWORD;

test("unauthenticated visitors are sent to the login page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "LostLink" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: "test-results/login-desktop.png" });

  await page.goto("/reports");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/import");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/reports/anything");
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});

test("login form validates locally before contacting Firebase", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Enter your admin email",
  );
  await page.getByLabel("Email", { exact: true }).fill("admin@campus.edu");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Enter your password",
  );
  await page.getByLabel("Password", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
});

test("login page fits a phone without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("signed-in dashboard workflow", async ({ page }) => {
  test.skip(!email || !password, "LOSTLINK_E2E_EMAIL/PASSWORD not set");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(
    page.getByRole("heading", { name: "Reports", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".skeleton-row")).toHaveCount(0, {
    timeout: 15000,
  });
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Search reports" })
    .fill("zzz-no-such-item");
  await expect(page.getByRole("heading", { name: /No reports/ })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
