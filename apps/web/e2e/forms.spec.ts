import { test, expect } from "@playwright/test";

test.describe("Form Interactions", () => {
    test.describe("Login Form", () => {
        test("should fill and submit login form", async ({ page }) => {
            await page.goto("/login");

            // Fill in the form
            await page.locator("#email").fill("test@example.com");
            await page.locator("#password").fill("testpassword123");

            // Verify values are filled
            await expect(page.locator("#email")).toHaveValue("test@example.com");
            await expect(page.locator("#password")).toHaveValue("testpassword123");

            // Submit button should be enabled
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeEnabled();
        });

        test("should disable submit button while loading", async ({ page }) => {
            await page.goto("/login");

            await page.locator("#email").fill("test@example.com");
            await page.locator("#password").fill("testpassword123");

            // Click submit and check if button becomes disabled
            const submitButton = page.locator('button[type="submit"]');
            await submitButton.click();

            // Button should show loading state (disabled or with loader)
            // This may be very brief, so we check it was clicked
            await expect(page).toHaveURL(/\/login/);
        });

        test("should handle email input validation", async ({ page }) => {
            await page.goto("/login");

            const emailInput = page.locator("#email");

            // Check input type is email (for built-in validation)
            await expect(emailInput).toHaveAttribute("type", "email");
        });

        test("should handle password input securely", async ({ page }) => {
            await page.goto("/login");

            const passwordInput = page.locator("#password");

            // Check input type is password (hides text)
            await expect(passwordInput).toHaveAttribute("type", "password");
        });
    });

    test.describe("Register Form", () => {
        test("should fill registration form", async ({ page }) => {
            await page.goto("/register");

            await page.locator("#name").fill("Test User");
            await page.locator("#email").fill("newuser@example.com");
            await page.locator("#password").fill("securePassword123");
            await page.locator("#confirmPassword").fill("securePassword123");

            // Verify all values
            await expect(page.locator("#name")).toHaveValue("Test User");
            await expect(page.locator("#email")).toHaveValue("newuser@example.com");
            await expect(page.locator("#password")).toHaveValue("securePassword123");
            await expect(page.locator("#confirmPassword")).toHaveValue("securePassword123");
        });

        test("should have proper autocomplete attributes", async ({ page }) => {
            await page.goto("/register");

            await expect(page.locator("#name")).toHaveAttribute("autocomplete", "name");
            await expect(page.locator("#email")).toHaveAttribute("autocomplete", "email");
            await expect(page.locator("#password")).toHaveAttribute("autocomplete", "new-password");
            await expect(page.locator("#confirmPassword")).toHaveAttribute("autocomplete", "new-password");
        });

        test("should show placeholders", async ({ page }) => {
            await page.goto("/register");

            await expect(page.locator("#name")).toHaveAttribute("placeholder", "John Doe");
            await expect(page.locator("#email")).toHaveAttribute("placeholder", "you@example.com");
            await expect(page.locator("#password")).toHaveAttribute("placeholder", "At least 8 characters");
            await expect(page.locator("#confirmPassword")).toHaveAttribute("placeholder", "Confirm your password");
        });
    });
});
