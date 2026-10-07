import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173/#/setup");
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/lagos-home.png", fullPage: true });
await page.locator("#play").click();
await page.waitForTimeout(1800);
await page.keyboard.press("Space");
await page.waitForTimeout(300);
await page.keyboard.down("KeyD");
await page.waitForTimeout(600);
await page.keyboard.up("KeyD");
await page.keyboard.press("Space");
await page.keyboard.press("KeyJ");
await page.keyboard.press("Escape");
if (!(await page.getByText("The ground can wait.").isVisible()))
  throw new Error("Pause failed");
await page.locator("#resume").click();
await page.screenshot({ path: "/tmp/lagos-match.png" });
await page.locator("#camera-view").click();
if (
  (await page.locator("#camera-view").getAttribute("aria-pressed")) !== "false"
)
  throw new Error("Wide camera toggle failed");
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/lagos-street-camera.png" });
await page.locator("#camera-view").click();
console.log("Scoreboard:", await page.locator("#scoreboard").innerText());
await page.keyboard.press("Escape");
await page.locator("#how-nav").click();
if (!(await page.locator("dialog").isVisible()))
  throw new Error("Controls failed");
await page.locator(".close").click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/lagos-mobile.png", fullPage: true });
console.log(
  "Horizontal overflow:",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
console.log("Runtime errors:", errors);
await browser.close();
if (errors.length) process.exit(1);
