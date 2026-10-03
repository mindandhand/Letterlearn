#!/usr/bin/env node
// Dedicated digit assets; deliberately leaves the existing alphabet generators unchanged.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const numberWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function parseArgs(argv) {
  const options = { accents: ["us", "gb"], force: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--accent") {
      const accent = argv[++index];
      if (!["us", "gb", "all"].includes(accent)) throw new Error("Use --accent us|gb|all");
      options.accents = accent === "all" ? ["us", "gb"] : [accent];
    } else if (arg === "--force") options.force = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help") {
      console.log("Usage: node scripts/generate-number-audio.mjs [--accent us|gb|all] [--force] [--dry-run]\nGenerates number-0.m4a through number-9.m4a; existing files are skipped by default.");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;
  for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 0) continue;
    const key = trimmed.slice(0, equals).trim();
    process.env[key] ||= trimmed.slice(equals + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment or .env`);
  return value;
}

async function synthesize(text, accent) {
  const token = required("VOLCENGINE_TTS_ACCESS_TOKEN");
  const encoding = process.env.VOLCENGINE_TTS_ENCODING ?? "wav";
  const payload = {
    app: { appid: required("VOLCENGINE_TTS_APP_ID"), token, cluster: process.env.VOLCENGINE_TTS_CLUSTER ?? "volcano_tts" },
    user: { uid: process.env.VOLCENGINE_TTS_UID ?? "letterlearn" },
    audio: {
      voice_type: process.env[`VOLCENGINE_TTS_VOICE_TYPE_${accent.toUpperCase()}`] ?? required("VOLCENGINE_TTS_VOICE_TYPE"),
      encoding,
      speed_ratio: Number(process.env.VOLCENGINE_TTS_SPEED_RATIO ?? "0.9"),
      volume_ratio: Number(process.env.VOLCENGINE_TTS_VOLUME_RATIO ?? "1.0"),
      pitch_ratio: Number(process.env.VOLCENGINE_TTS_PITCH_RATIO ?? "1.0"),
    },
    request: { reqid: randomUUID(), text, text_type: "plain", operation: "query" },
  };
  const body = JSON.stringify(payload);
  // Fail fast without retries. Do not include provider response bodies or credentials in errors.
  const response = await new Promise((resolve, reject) => {
    const request = https.request(process.env.VOLCENGINE_TTS_ENDPOINT ?? "https://openspeech.bytedance.com/api/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer;${token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", () => reject(new Error("TTS response interrupted")));
      res.on("end", () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`TTS HTTP ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(new Error("TTS returned invalid JSON")); }
      });
    });
    request.setTimeout(30000, () => request.destroy(new Error("TTS request timed out")));
    request.on("error", (error) => reject(new Error(`TTS request failed (${error.code ?? "timeout"})`)));
    request.end(body);
  });
  if (response.code !== 3000 || !response.data) throw new Error(`TTS synthesis failed (code ${Number(response.code)})`);
  return { data: Buffer.from(response.data, "base64"), encoding };
}

async function writeAudio({ data, encoding }, target) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "letterlearn-numbers-"));
  const raw = path.join(tempDir, "input");
  const output = path.join(tempDir, "output.m4a");
  try {
    await writeFile(raw, data);
    if (encoding === "m4a") await rename(raw, output);
    else await execFileAsync("afconvert", ["-f", "m4af", "-d", "aac", raw, output]);
    // Publish only after synthesis and conversion have succeeded.
    await rename(output, target);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun) await loadEnv();
  for (const accent of options.accents) {
    const outputDir = path.join(rootDir, "public", "audio", accent);
    if (!options.dryRun) await mkdir(outputDir, { recursive: true });
    for (const [digit, word] of numberWords.entries()) {
      const target = path.join(outputDir, `number-${digit}.m4a`);
      const displayPath = path.relative(rootDir, target);
      if (!options.force && existsSync(target)) { console.log(`skip ${displayPath}`); continue; }
      console.log(`${options.dryRun ? "plan" : "write"} ${displayPath} <- "${word}"`);
      if (options.dryRun) continue;
      await writeAudio(await synthesize(word, accent), target);
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.VOLCENGINE_TTS_DELAY_MS ?? "250")));
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
