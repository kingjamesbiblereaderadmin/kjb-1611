/**
 * WebdriverIO + Appium config for full native-app UI testing.
 *
 * This drives the ACTUAL debug APK on a real (emulated) Android device —
 * install, launch, tap real buttons, read real WebView DOM content — as
 * opposed to the Playwright suite (tests/), which tests the same web
 * content in a desktop browser. Together they cover both layers: Playwright
 * catches web/layout bugs cheaply and fast; this catches native-shell bugs
 * (install/launch failures, WebView bridging issues, deep links) the
 * Playwright suite structurally cannot see.
 *
 * Expects an Appium server (auto-started via the appium service below) and
 * a running Android emulator/device with the debug APK already built at
 * android/app/build/outputs/apk/debug/app-debug.apk (see
 * .github/workflows/android-full-test.yml, which builds it before running
 * this).
 */
const APP_PACKAGE = 'com.kingjamesbiblereader.twa';
const APP_ACTIVITY = '.MainActivity';

export const config = {
  runner: 'local',
  specs: ['./tests-android/specs/**/*.spec.js'],
  maxInstances: 1,
  // No hostname/port here — @wdio/appium-service starts a local Appium
  // server on 127.0.0.1:4723 and wires these automatically.
  services: [
    [
      'appium',
      {
        args: { relaxedSecurity: true },
        logPath: './appium-logs/',
      },
    ],
  ],
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      'appium:app': process.env.ANDROID_APK_PATH || './android/app/build/outputs/apk/debug/app-debug.apk',
      'appium:appPackage': APP_PACKAGE,
      'appium:appActivity': APP_ACTIVITY,
      'appium:appWaitForLaunch': true,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 240,
      // This emulator only gets 1 virtual CPU core on GitHub's shared CI
      // runners (confirmed in the emulator's own boot log: "Running on a
      // system with less than 6 logical cores. Setting number of virtual
      // cores to 1"), which makes it far slower than a normal dev machine
      // or device — every one of Appium's own default operation timeouts
      // (20-30s) was too tight for it: installing the UiAutomator2 test
      // server, launching its instrumentation process, and starting the
      // app itself were all timing out well before the operation actually
      // finished. These are deliberately generous rather than tuned tight,
      // since a slow CI runner is the norm here, not the exception.
      'appium:uiautomator2ServerInstallTimeout': 180000,
      'appium:uiautomator2ServerLaunchTimeout': 180000,
      'appium:adbExecTimeout': 120000,
      'appium:androidInstallTimeout': 180000,
      'appium:avdLaunchTimeout': 300000,
      'appium:avdReadyTimeout': 300000,
      // Don't wipe app data between specs within one run — each spec
      // navigates fresh via the reader's own URL sync, and reinstalling per
      // spec would multiply an already-slow emulator run several times
      // over for little benefit.
      'appium:noReset': true,
    },
  ],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 300000,
  connectionRetryCount: 2,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
};
