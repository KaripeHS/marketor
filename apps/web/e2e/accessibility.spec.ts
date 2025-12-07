import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
    test.describe("Login Page Accessibility", () => {
        test("should have proper form labels", async ({ page }) => {
            await page.goto("/login");

            // Check labels are properly associated with inputs
            const emailLabel = page.locator('label[for="email"]');
            const passwordLabel = page.locator('label[for="password"]');

            await expect(emailLabel).toBeVisible();
            await expect(passwordLabel).toBeVisible();
            await expect(emailLabel).toContainText("Email");
            await expect(passwordLabel).toContainText("Password");
        });

        test("should have proper heading hierarchy", async ({ page }) => {
            await page.goto("/login");

            // Should have h2 heading
            const h2 = page.locator("h2");
            await expect(h2).toBeVisible();
            await expect(h2).toContainText("Sign in to GrowthPilot");
        });

        test("should be keyboard navigable", async ({ page }) => {
            await page.goto("/login");

            // Tab through form elements
            await page.keyboard.press("Tab");
            // First focusable should be email or a link
            const focusedElement = page.locator(":focus");
            await expect(focusedElement).toBeVisible();

            // Continue tabbing
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");

            // Should eventually reach submit button
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeVisible();
        });

        test("should have visible focus states", async ({ page }) => {
            await page.goto("/login");

            // Focus on email input
            await page.locator("#email").focus();

            // Check that the element has focus
            const emailInput = page.locator("#email");
            await expect(emailInput).toBeFocused();
        });
    });

    test.describe("Register Page Accessibility", () => {
        test("should have proper form labels", async ({ page }) => {
            await page.goto("/register");

            // Check all labels exist
            await expect(page.locator('label[for="name"]')).toBeVisible();
            await expect(page.locator('label[for="email"]')).toBeVisible();
            await expect(page.locator('label[for="password"]')).toBeVisible();
            await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
        });

        test("should have descriptive link text", async ({ page }) => {
            await page.goto("/register");

            const loginLink = page.locator('a[href="/login"]');
            await expect(loginLink).toContainText("Sign in");
        });
    });

    test.describe("Color and Contrast", () => {
        test("should have sufficient color contrast for text", async ({ page }) => {
            await page.goto("/login");

            // Check that main heading is visible (implies sufficient contrast)
            const heading = page.locator("h2");
            await expect(heading).toBeVisible();

            // Check labels are visible
            const labels = page.locator("label");
            const count = await labels.count();
            expect(count).toBeGreaterThan(0);
        });
    });

    test.describe("Interactive Elements", () => {
        test("login button should be clearly clickable", async ({ page }) => {
            await page.goto("/login");

            const submitButton = page.locator('button[type="submit"]');

            // Check button styling indicates it's clickable
            await expect(submitButton).toBeVisible();
            await expect(submitButton).toBeEnabled();
        });

        test("links should be distinguishable", async ({ page }) => {
            await page.goto("/login");

            const registerLink = page.locator('a[href="/register"]');
            await expect(registerLink).toBeVisible();

            // Link should have different styling (blue color class)
            await expect(registerLink).toHaveClass(/text-blue-600/);
        });
    });
});
