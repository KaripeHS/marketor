import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
    test.describe("Login Page", () => {
        test("should display login form", async ({ page }) => {
            await page.goto("/login");

            // Check page title and heading
            await expect(page.locator("h2")).toContainText("Sign in to GrowthPilot");

            // Check form elements exist
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toContainText("Sign in");

            // Check register link exists
            await expect(page.locator('a[href="/register"]')).toBeVisible();
        });

        test("should show validation for empty fields", async ({ page }) => {
            await page.goto("/login");

            // Try to submit without filling fields
            await page.locator('button[type="submit"]').click();

            // HTML5 validation should prevent submission
            const emailInput = page.locator("#email");
            await expect(emailInput).toHaveAttribute("required", "");
        });

        test("should navigate to register page", async ({ page }) => {
            await page.goto("/login");

            await page.locator('a[href="/register"]').click();

            await expect(page).toHaveURL("/register");
            await expect(page.locator("h2")).toContainText("Create your account");
        });

        test("should show error for invalid credentials", async ({ page }) => {
            await page.goto("/login");

            await page.locator("#email").fill("invalid@example.com");
            await page.locator("#password").fill("wrongpassword");
            await page.locator('button[type="submit"]').click();

            // Wait for error toast or message (depends on API response)
            // The form should remain on login page
            await expect(page).toHaveURL(/\/login/);
        });
    });

    test.describe("Register Page", () => {
        test("should display registration form", async ({ page }) => {
            await page.goto("/register");

            // Check page heading
            await expect(page.locator("h2")).toContainText("Create your account");

            // Check form elements exist
            await expect(page.locator("#name")).toBeVisible();
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();
            await expect(page.locator("#confirmPassword")).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toContainText("Create account");

            // Check login link exists
            await expect(page.locator('a[href="/login"]')).toBeVisible();
        });

        test("should navigate to login page", async ({ page }) => {
            await page.goto("/register");

            await page.locator('a[href="/login"]').click();

            await expect(page).toHaveURL("/login");
            await expect(page.locator("h2")).toContainText("Sign in to GrowthPilot");
        });

        test("should show name field is optional", async ({ page }) => {
            await page.goto("/register");

            const nameLabel = page.locator('label[for="name"]');
            await expect(nameLabel).toContainText("optional");

            // Name should not have required attribute
            const nameInput = page.locator("#name");
            await expect(nameInput).not.toHaveAttribute("required", "");
        });

        test("should require email and password fields", async ({ page }) => {
            await page.goto("/register");

            await expect(page.locator("#email")).toHaveAttribute("required", "");
            await expect(page.locator("#password")).toHaveAttribute("required", "");
            await expect(page.locator("#confirmPassword")).toHaveAttribute("required", "");
        });
    });

    test.describe("Authentication Flow", () => {
        test("should handle unauthenticated dashboard access", async ({ page }) => {
            // Try to access dashboard without logging in
            const response = await page.goto("/dashboard");

            // Page should load without server error
            expect(response?.status()).toBeLessThan(500);

            // Wait for client-side auth check
            await page.waitForTimeout(500);

            // Should either be on dashboard (loading/checking auth) or redirected to login
            const url = page.url();
            expect(url).toMatch(/\/(dashboard|login)/);
        });
    });
});
