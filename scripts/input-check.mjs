import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
});
await page.goto("http://localhost:5173");
const result = await page.evaluate(async () => {
  const { InputManager } = await import("/src/game/input.ts");
  const input = new InputManager(() => {});
  input.bindTouch();
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { code: "KeyD", bubbles: true }),
  );
  const keyboard = input.read();
  document.body.dispatchEvent(
    new KeyboardEvent("keyup", { code: "KeyD", bubbles: true }),
  );
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [
      {
        axes: [0.6, -0.4],
        buttons: Array.from({ length: 16 }, (_, i) => ({
          pressed: i === 0 || i === 5,
        })),
      },
    ],
  });
  const gamepad = input.read();
  const held = input.read();
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [],
  });
  document
    .querySelector('[data-action="shoot"]')
    .dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }),
    );
  const touch = input.read();
  return {
    keyboard: keyboard.x === 1,
    gamepad: gamepad.x === 0.6 && gamepad.pass && gamepad.sprint,
    edge: !held.pass,
    touch: touch.shoot,
  };
});
console.log(result);
await browser.close();
if (Object.values(result).some((v) => !v)) process.exit(1);
