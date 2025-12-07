import { test, expect, devices } from "@playwright/test";

test.describe("Responsive Design", () => {
    test.describe("Mobile View", () => {
        test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

        test("login page should be usable on mobile", async ({ page }) => {
            await page.goto("/login");

            // Form should be visible
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();

            // Heading should be visible
            await expect(page.locator("h2")).toBeVisible();
        });

        test("register page should be usable on mobile", async ({ page }) => {
            await page.goto("/register");

            // All form fields should be visible
            await expect(page.locator("#name")).toBeVisible();
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();
            await expect(page.locator("#confirmPassword")).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
        });

        test("form inputs should be touch-friendly", async ({ page }) => {
            await page.goto("/login");

            // Check input height is reasonable for touch (at least 40px)
            const emailInput = page.locator("#email");
            const boundingBox = await emailInput.boundingBox();

            expect(boundingBox?.height).toBeGreaterThanOrEqual(36);
        });
    });

    test.describe("Tablet View", () => {
        test.use({ viewport: { width: 768, height: 1024 } }); // iPad

        test("login page should display properly on tablet", async ({ page }) => {
            await page.goto("/login");

            // Form container should be centered
            await expect(page.locator("h2")).toBeVisible();
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();
        });
    });

    test.describe("Desktop View", () => {
        test.use({ viewport: { width: 1280, height: 800 } });

        test("login page should display properly on desktop", async ({ page }) => {
            await page.goto("/login");

            // All elements should be visible and centered
            await expect(page.locator("h2")).toBeVisible();
            await expect(page.locator("#email")).toBeVisible();
            await expect(page.locator("#password")).toBeVisible();

            // Form container should have max-width applied
            const formContainer = page.locator(".max-w-md");
            await expect(formContainer).toBeVisible();
        });

        test("register page should display properly on desktop", async ({ page }) => {
            await page.goto("/register");

            await expect(page.locator("h2")).toBeVisible();
            await expect(page.locator("#name")).toBeVisible();
            await expect(page.locator("#email")).toBeVisible();
        });
    });

    test.describe("Large Desktop View", () => {
        test.use({ viewport: { width: 1920, height: 1080 } });

        test("form should remain centered on large screens", async ({ page }) => {
            await page.goto("/login");

            const formContainer = page.locator(".max-w-md");
            const boundingBox = await formContainer.boundingBox();

            // Form should be horizontally centered (roughly)
            if (boundingBox) {
                const centerX = boundingBox.x + boundingBox.width / 2;
                const viewportCenter = 1920 / 2;

                // Allow some margin of error (100px)
                expect(Math.abs(centerX - viewportCenter)).toBeLessThan(100);
            }
        });
    });
});
