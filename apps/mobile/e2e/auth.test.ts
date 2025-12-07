import { by, device, element, expect } from "detox";

describe("Authentication", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("Login Screen", () => {
    it("should display login form elements", async () => {
      // Navigate to login if not already there
      await expect(element(by.text("Marketor"))).toBeVisible();
      await expect(element(by.text("Sign in to your account"))).toBeVisible();
      await expect(element(by.id("login-email-input"))).toBeVisible();
      await expect(element(by.id("login-password-input"))).toBeVisible();
      await expect(element(by.id("login-submit-button"))).toBeVisible();
    });

    it("should show error alert for empty fields", async () => {
      await element(by.id("login-submit-button")).tap();
      await expect(element(by.text("Please fill in all fields"))).toBeVisible();
    });

    it("should allow typing in email and password fields", async () => {
      await element(by.id("login-email-input")).typeText("test@example.com");
      await element(by.id("login-password-input")).typeText("password123");

      // Verify the text was entered
      await expect(element(by.id("login-email-input"))).toHaveText("test@example.com");
    });

    it("should navigate to register screen", async () => {
      await element(by.text("Sign up")).tap();
      await expect(element(by.text("Create your account"))).toBeVisible();
    });
  });

  describe("Register Screen", () => {
    beforeEach(async () => {
      // Navigate to register screen
      await device.reloadReactNative();
      await element(by.text("Sign up")).tap();
    });

    it("should display registration form elements", async () => {
      await expect(element(by.text("Create your account"))).toBeVisible();
      await expect(element(by.id("register-name-input"))).toBeVisible();
      await expect(element(by.id("register-email-input"))).toBeVisible();
      await expect(element(by.id("register-password-input"))).toBeVisible();
      await expect(element(by.id("register-submit-button"))).toBeVisible();
    });

    it("should show error for empty required fields", async () => {
      await element(by.id("register-submit-button")).tap();
      await expect(element(by.text("Email and password are required"))).toBeVisible();
    });

    it("should show error for short password", async () => {
      await element(by.id("register-email-input")).typeText("test@example.com");
      await element(by.id("register-password-input")).typeText("12345");
      await element(by.id("register-submit-button")).tap();
      await expect(element(by.text("Password must be at least 6 characters"))).toBeVisible();
    });

    it("should navigate back to login screen", async () => {
      await element(by.text("Sign in")).tap();
      await expect(element(by.text("Sign in to your account"))).toBeVisible();
    });

    it("should allow optional name field", async () => {
      await element(by.id("register-name-input")).typeText("Test User");
      await element(by.id("register-email-input")).typeText("test@example.com");
      await element(by.id("register-password-input")).typeText("password123");

      // Form should be valid (name is optional)
      await expect(element(by.id("register-submit-button"))).toBeVisible();
    });
  });
});
