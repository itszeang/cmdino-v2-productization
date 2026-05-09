import { $, $$, browser, expect } from "@wdio/globals";

function textSelector(text: string): string {
  return `//*[normalize-space()="${text}"]`;
}

function upperTextSelector(text: string): string {
  return "//*[translate(normalize-space(), " +
    "'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')='" +
    text.toUpperCase() +
    "']";
}

async function expectVisibleText(text: string): Promise<void> {
  await expect($(textSelector(text))).toBeDisplayed();
}

async function visibleTextCount(text: string): Promise<number> {
  const elements = await $$(textSelector(text));
  let count = 0;
  for (const element of elements) {
    if (await element.isDisplayed()) count += 1;
  }
  return count;
}

async function clickText(text: string): Promise<void> {
  const element = await $(textSelector(text));
  await element.waitForDisplayed();
  await element.click();
}

async function closePanelIfPresent(): Promise<void> {
  const closeCandidates = await $$(
    "//*[@title='Close' or @aria-label='Close' or normalize-space()='Close' or normalize-space()='Cancel']",
  );
  for (const close of closeCandidates) {
    if (await close.isDisplayed()) {
      await close.click();
      return;
    }
  }
}

describe("CMDino desktop smoke", () => {
  beforeEach(async () => {
    await browser.waitUntil(async () => (await $("body").isExisting()), {
      timeout: 10_000,
      timeoutMsg: "App body did not appear",
    });
  });

  it("launches and shows the shell controls", async () => {
    await expect($("body")).toBeExisting();
    await expectVisibleText("+ Agent");
    await expectVisibleText("Health");
    await expectVisibleText("Output Library");
    await expect($(upperTextSelector("Focus"))).toBeExisting();
    await expect($(upperTextSelector("Grid"))).toBeExisting();
  });

  it("opens System Health", async () => {
    await clickText("Health");

    await expectVisibleText("System Health");
    await closePanelIfPresent();
  });

  it("opens Output Library", async () => {
    await clickText("Output Library");

    await browser.waitUntil(async () => (await visibleTextCount("Output Library")) >= 2, {
      timeout: 10_000,
      timeoutMsg: "Output Library drawer title did not appear",
    });
    await closePanelIfPresent();
  });

  it("opens Deploy Agent", async () => {
    await clickText("+ Agent");

    await expectVisibleText("Deploy Agent");
    await closePanelIfPresent();
  });
});
