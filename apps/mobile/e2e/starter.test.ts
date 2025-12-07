import { by, device, element, expect } from "detox";

describe("App Launch", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it("should launch the app successfully", async () => {
    // Verify the app loads and shows the main screen
    await expect(element(by.text("Marketor"))).toBeVisible();
  });

  it("should show the login screen for unauthenticated users", async () => {
    await expect(element(by.text("Sign in to your account"))).toBeVisible();
  });

  it("should have working keyboard interactions", async () => {
    // Tap on email input to open keyboard
    await element(by.id("login-email-input")).tap();

    // Type some text
    await element(by.id("login-email-input")).typeText("test");

    // Dismiss keyboard
    await device.pressBack(); // Android - dismiss keyboard
    // For iOS: await element(by.id("login-email-input")).tapReturnKey();
  });

  it("should handle app backgrounding and foregrounding", async () => {
    await device.sendToHome();
    await device.launchApp({ newInstance: false });

    // App should still be on the same screen
    await expect(element(by.text("Marketor"))).toBeVisible();
  });
});
