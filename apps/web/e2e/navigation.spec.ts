import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
    test.describe("Public Pages", () => {
        test("should load the homepage", async ({ page }) => {
            await page.goto("/");

            // Check that the page loads (either landing or redirect to login)
            await expect(page).toHaveURL(/\/(login)?/);
        });

        test("should load login page", async ({ page }) => {
            await page.goto("/login");

            await expect(page).toHaveURL("/login");
            await expect(page.locator("h2")).toBeVisible();
        });

        test("should load register page", async ({ page }) => {
            await page.goto("/register");

            await expect(page).toHaveURL("/register");
            await expect(page.locator("h2")).toBeVisible();
        });
    });

    test.describe("Navigation Links", () => {
        test("should navigate between login and register", async ({ page }) => {
            // Start at login
            await page.goto("/login");
            await expect(page.locator("h2")).toContainText("Sign in");

            // Click register link
            await page.click('a[href="/register"]');
            await expect(page).toHaveURL("/register");
            await expect(page.locator("h2")).toContainText("Create your account");

            // Click login link
            await page.click('a[href="/login"]');
            await expect(page).toHaveURL("/login");
            await expect(page.locator("h2")).toContainText("Sign in");
        });
    });

    test.describe("Protected Routes", () => {
        const protectedRoutes = [
            "/dashboard",
            "/dashboard/campaigns",
            "/dashboard/content",
            "/dashboard/analytics",
            "/dashboard/strategy",
            "/dashboard/brand",
            "/dashboard/plans",
            "/dashboard/calendar",
            "/dashboard/team",
            "/dashboard/settings",
            "/dashboard/notifications",
            "/dashboard/integrations",
            "/dashboard/audit",
            "/dashboard/revisions",
        ];

        for (const route of protectedRoutes) {
            test(`should load ${route} without server error`, async ({ page }) => {
                const response = await page.goto(route);

                // Page should load without 5xx errors
                // Auth handling is client-side, so page loads first then may redirect
                expect(response?.status()).toBeLessThan(500);

                // Page should either show dashboard layout or redirect to login
                // Give time for client-side auth check
                await page.waitForTimeout(500);
                const url = page.url();
                expect(url).toMatch(/\/(dashboard|login)/);
            });
        }
    });

    test.describe("404 Handling", () => {
        test("should handle non-existent routes gracefully", async ({ page }) => {
            const response = await page.goto("/non-existent-route-12345");

            // Should either show 404 or redirect
            expect(response?.status()).toBeLessThan(500);
        });
    });
});
