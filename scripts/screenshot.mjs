import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const OUT = "docs/screenshots";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// 1. Home page
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/home.png` });
console.log("✓ home.png");

// 2. Free Play game — press F and capture celebration
await page.click(".mode-card:first-child");
await page.waitForTimeout(600);
await page.keyboard.press("f");
await page.waitForTimeout(2200); // wait for celebration
await page.screenshot({ path: `${OUT}/game-freeplay.png` });
console.log("✓ game-freeplay.png");

// 3. Find the Letter mode
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.click(".mode-card:nth-child(2)");
await page.waitForTimeout(1800); // wait for prompt audio
await page.screenshot({ path: `${OUT}/game-find-letter.png` });
console.log("✓ game-find-letter.png");

await browser.close();
console.log("Done.");
