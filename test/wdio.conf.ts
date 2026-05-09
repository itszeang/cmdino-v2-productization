import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
  runner: "local",
  framework: "mocha",
  reporters: ["spec"],
  specs: ["./test/specs/**/*.e2e.ts"],
  maxInstances: 1,
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  logLevel: "info",
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  capabilities: [{
    browserName: "wry",
    "tauri:options": {
      application: "src-tauri/target/release/cmdino.exe",
    },
  }],
  mochaOpts: {
    timeout: 30_000,
  },
};
