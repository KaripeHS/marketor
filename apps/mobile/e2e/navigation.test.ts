import { by, device, element, expect } from "detox";

describe("Navigation", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("Authentication Flow Navigation", () => {
    it("should start on the login screen when not authenticated", async () => {
      await expect(element(by.text("Sign in to your account"))).toBeVisible();
    });

    it("should navigate between login and register screens", async () => {
      // Start on login
      await expect(element(by.text("Sign in to your account"))).toBeVisible();

      // Go to register
      await element(by.text("Sign up")).tap();
      await expect(element(by.text("Create your account"))).toBeVisible();

      // Go back to login
      await element(by.text("Sign in")).tap();
      await expect(element(by.text("Sign in to your account"))).toBeVisible();
    });
  });

  describe("Tab Navigation (when authenticated)", () => {
    // Note: These tests require a logged-in user
    // In a real setup, you would mock the auth state or use test credentials

    it.skip("should display bottom tab navigation after login", async () => {
      // This test would require setting up mock auth or test credentials
      // await loginWithTestUser();

      // Check for tab bar items
      await expect(element(by.text("Home"))).toBeVisible();
      await expect(element(by.text("Campaigns"))).toBeVisible();
      await expect(element(by.text("Content"))).toBeVisible();
      await expect(element(by.text("Settings"))).toBeVisible();
    });

    it.skip("should navigate between tabs", async () => {
      // await loginWithTestUser();

      // Navigate to Campaigns tab
      await element(by.text("Campaigns")).tap();
      await expect(element(by.text("Campaigns"))).toBeVisible();

      // Navigate to Content tab
      await element(by.text("Content")).tap();
      await expect(element(by.text("Content"))).toBeVisible();

      // Navigate to Settings tab
      await element(by.text("Settings")).tap();
      await expect(element(by.text("Settings"))).toBeVisible();

      // Navigate back to Home
      await element(by.text("Home")).tap();
    });
  });

  describe("Deep Linking", () => {
    it.skip("should handle deep links to content items", async () => {
      // Test deep linking functionality
      // await device.openURL({ url: "growthpilot://content/123" });
      // await expect(element(by.id("content-detail-screen"))).toBeVisible();
    });
  });
});
