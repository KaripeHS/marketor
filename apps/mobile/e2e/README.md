# Mobile E2E Tests with Detox

This directory contains end-to-end tests for the GrowthPilot mobile app using Detox.

## Prerequisites

### iOS (macOS only)
- Xcode 14+ with command-line tools
- iOS Simulator
- CocoaPods

### Android
- Android Studio with SDK
- Android Emulator (AVD) or physical device
- Java 11+

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/mobile
   npm install
   ```

2. **Install Detox CLI globally:**
   ```bash
   npm install -g detox-cli
   ```

3. **For iOS (requires bare workflow/ejected app):**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **For Android:**
   - Ensure `ANDROID_SDK_ROOT` is set
   - Create an AVD named `Pixel_4_API_30` or update `.detoxrc.js`

## Running Tests

### Build the app for testing

```bash
# iOS
npm run build:e2e:ios

# Android
npm run build:e2e:android
```

### Run the tests

```bash
# iOS Simulator
npm run test:e2e:ios

# Android Emulator
npm run test:e2e:android
```

## Test Structure

- `starter.test.ts` - Basic app launch and initialization tests
- `auth.test.ts` - Authentication flow tests (login, register)
- `navigation.test.ts` - Navigation and routing tests

## Writing Tests

Tests use Detox matchers and actions:

```typescript
import { by, device, element, expect } from "detox";

describe("Feature", () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should do something", async () => {
    await expect(element(by.id("my-element"))).toBeVisible();
    await element(by.id("my-button")).tap();
    await element(by.id("my-input")).typeText("Hello");
  });
});
```

### Common Matchers
- `by.id("testID")` - Match by testID prop
- `by.text("text")` - Match by text content
- `by.label("label")` - Match by accessibility label
- `by.type("RCTView")` - Match by native component type

### Common Actions
- `.tap()` - Tap element
- `.longPress()` - Long press
- `.typeText("text")` - Type text into input
- `.clearText()` - Clear input text
- `.scroll(pixels, "down")` - Scroll
- `.swipe("left")` - Swipe gesture

### Common Expectations
- `.toBeVisible()` - Element is visible
- `.toExist()` - Element exists in hierarchy
- `.toHaveText("text")` - Element has specific text
- `.toHaveId("id")` - Element has testID

## Notes for Expo Apps

For Expo managed workflow apps, you have two options:

1. **Expo Development Build** (Recommended)
   - Use `expo-dev-client` to create a development build
   - Detox can then test the native build

2. **Eject to Bare Workflow**
   - Run `expo eject` to get native projects
   - Full Detox support with native builds

The current configuration assumes a bare workflow. For Expo managed apps,
consider using Maestro as an alternative E2E testing solution.

## Troubleshooting

### iOS Build Issues
- Run `pod install --repo-update` in the ios directory
- Clean build: `xcodebuild clean`

### Android Build Issues
- Ensure correct SDK version is installed
- Check that the emulator matches the AVD name in `.detoxrc.js`

### Test Timeouts
- Increase timeout in `jest.config.js`
- Add `await waitFor(element).toBeVisible().withTimeout(10000)`

### Element Not Found
- Verify the `testID` prop is set on the component
- Use Detox's debug mode: `detox test --debug-synchronization 500`
