#!/usr/bin/env node
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputRoot = path.join(rootDir, "public", "audio");

const letters = [
  ["A", "Apple", "apple", "A says ah."],
  ["B", "Ball", "ball", "B says buh."],
  ["C", "Cat", "cat", "C says kuh."],
  ["D", "Dog", "dog", "D says duh."],
  ["E", "Egg", "egg", "E says eh."],
  ["F", "Fish", "fish", "F says fff."],
  ["G", "Grapes", "grapes", "G says guh."],
  ["H", "Hat", "hat", "H says huh."],
  ["I", "Ice cream", "ice-cream", "I says ih."],
  ["J", "Juice", "juice", "J says juh."],
  ["K", "Kite", "kite", "K says kuh."],
  ["L", "Lion", "lion", "L says lll."],
  ["M", "Moon", "moon", "M says mmm."],
  ["N", "Nest", "nest", "N says nnn."],
  ["O", "Orange", "orange", "O says aw."],
  ["P", "Pig", "pig", "P says puh."],
  ["Q", "Queen", "queen", "Q says kwuh."],
  ["R", "Rabbit", "rabbit", "R says rrr."],
  ["S", "Sun", "sun", "S says sss."],
  ["T", "Tree", "tree", "T says tuh."],
  ["U", "Umbrella", "umbrella", "U says uh."],
  ["V", "Violin", "violin", "V says vvv."],
  ["W", "Whale", "whale", "W says wuh."],
  ["X", "Xylophone", "xylophone", "X says ks."],
  ["Y", "Yo-yo", "yo-yo", "Y says yuh."],
  ["Z", "Zebra", "zebra", "Z says zzz."],
];

function parseArgs(argv) {
  const options = {
    accents: ["us", "gb"],
    force: false,
    dryRun: false,
    onlyLetters: undefined,
    pairsOnly: false,
    soundsOnly: false,
    feedbackOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--accent" && next) {
      options.accents = next === "all" ? ["us", "gb"] : [next];
      index += 1;
    } else if (arg === "--only" && next) {
      options.onlyLetters = new Set(next.split(",").map((letter) => letter.trim().toUpperCase()).filter(Boolean));
      index += 1;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--pairs-only") {
      options.pairsOnly = true;
    } else if (arg === "--sounds-only") {
      options.soundsOnly = true;
    } else if (arg === "--feedback-only") {
      options.feedbackOnly = true;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const accent of options.accents) {
    if (accent !== "us" && accent !== "gb") {
      throw new Error(`Unsupported accent "${accent}". Use "us", "gb", or "all".`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Generate Letterlearn audio with Volcengine TTS.

Usage:
  node scripts/generate-volcengine-audio.mjs [options]

Options:
  --accent us|gb|all  Generate one accent or both. Default: all
  --only A,B,C        Generate only selected letters, plus test-sound
  --pairs-only        Generate only pair clips for the selected accents
  --sounds-only       Generate only phonics clips for the selected accents
  --feedback-only     Generate only correct/hint feedback clips
  --force             Overwrite existing files
  --dry-run           Print planned files without calling the API
  --help              Show this help
`);
}

async function loadEnv() {
  if (!existsSync(envPath)) {
    throw new Error("Missing .env. Copy .env.example to .env and fill in Volcengine credentials.");
  }

  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

function getConfig() {
  const appId = requiredEnv("VOLCENGINE_TTS_APP_ID");
  const token = requiredEnv("VOLCENGINE_TTS_ACCESS_TOKEN");
  const endpoint = process.env.VOLCENGINE_TTS_ENDPOINT ?? "https://openspeech.bytedance.com/api/v1/tts";
  const cluster = process.env.VOLCENGINE_TTS_CLUSTER ?? "volcano_tts";
  const encoding = process.env.VOLCENGINE_TTS_ENCODING ?? "wav";
  const outputFormat = process.env.VOLCENGINE_TTS_OUTPUT_FORMAT ?? "m4a";
  const delayMs = Number(process.env.VOLCENGINE_TTS_DELAY_MS ?? "250");

  return {
    appId,
    token,
    endpoint,
    cluster,
    encoding,
    outputFormat,
    delayMs,
    maxRetries: Number(process.env.VOLCENGINE_TTS_MAX_RETRIES ?? "3"),
    speedRatio: Number(process.env.VOLCENGINE_TTS_SPEED_RATIO ?? "0.9"),
    volumeRatio: Number(process.env.VOLCENGINE_TTS_VOLUME_RATIO ?? "1.0"),
    pitchRatio: Number(process.env.VOLCENGINE_TTS_PITCH_RATIO ?? "1.0"),
    uid: process.env.VOLCENGINE_TTS_UID ?? "letterlearn",
  };
}

function getVoiceType(accent) {
  const suffix = accent.toUpperCase();
  const voiceType = process.env[`VOLCENGINE_TTS_VOICE_TYPE_${suffix}`] ?? process.env.VOLCENGINE_TTS_VOICE_TYPE;
  if (!voiceType) {
    throw new Error(`Missing VOLCENGINE_TTS_VOICE_TYPE_${suffix} or VOLCENGINE_TTS_VOICE_TYPE in .env`);
  }
  return voiceType;
}

function buildItems(onlyLetters, pairsOnly, soundsOnly, feedbackOnly) {
  const selectedLetters = onlyLetters ? letters.filter(([letter]) => onlyLetters.has(letter)) : letters;
  const items = [];

  for (const [letter, word, slug, phonicsText] of selectedLetters) {
    const lower = letter.toLowerCase();
    if (feedbackOnly) {
      items.push({ filename: `correct-${letter}`, text: `Yes. ${letter} says ${phonicsText.split(" says ")[1]} ${letter} is for ${word}.` });
      items.push({ filename: `hint-${letter}`, text: `Try again. Find ${letter}.` });
      continue;
    }
    if (!soundsOnly) {
      items.push({ filename: `pair-${letter}`, text: `Big ${letter}, small ${lower}.` });
    }
    if (!pairsOnly) {
      items.push({ filename: `sound-${letter}`, text: phonicsText });
    }
    if (!pairsOnly && !soundsOnly) {
      items.push({ filename: `letter-${letter}`, text: lower });
      items.push({ filename: `word-${slug}`, text: word });
      items.push({ filename: `prompt-${letter}`, text: `Press ${letter}.` });
    }
  }

  if (!pairsOnly && !soundsOnly && !feedbackOnly) {
    items.push({ filename: "test-sound", text: "Hello! This is how I sound." });
  }
  return items;
}

async function synthesize(text, accent, config) {
  const voiceType = getVoiceType(accent);
  const payload = {
    app: {
      appid: config.appId,
      token: config.token,
      cluster: config.cluster,
    },
    user: {
      uid: config.uid,
    },
    audio: {
      voice_type: voiceType,
      encoding: config.encoding,
      speed_ratio: config.speedRatio,
      volume_ratio: config.volumeRatio,
      pitch_ratio: config.pitchRatio,
    },
    request: {
      reqid: randomUUID(),
      text,
      text_type: "plain",
      operation: "query",
    },
  };

  const response = await postJsonWithRetries(config.endpoint, payload, config.token, config.maxRetries);
  if (response.code !== 3000 || !response.data) {
    throw new Error(`Volcengine TTS failed: ${JSON.stringify(response)}`);
  }

  return Buffer.from(response.data, "base64");
}

async function postJsonWithRetries(endpoint, payload, token, maxRetries) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await postJson(endpoint, payload, token);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await wait(750 * attempt);
    }
  }
  throw lastError;
}

function postJson(endpoint, payload, token) {
  const url = new URL(endpoint);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          Authorization: `Bearer;${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode}: ${text}`));
            return;
          }

          try {
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      },
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function writeAudioFile(rawAudio, targetPath, config) {
  if (config.outputFormat === config.encoding) {
    await writeFile(targetPath, rawAudio);
    return;
  }

  if (config.outputFormat !== "m4a") {
    throw new Error(`Unsupported output conversion to ${config.outputFormat}. Use m4a or match VOLCENGINE_TTS_ENCODING.`);
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "letterlearn-volcengine-"));
  const rawPath = path.join(tempDir, `input.${config.encoding}`);

  try {
    await writeFile(rawPath, rawAudio);
    await execFileAsync("afconvert", ["-f", "m4af", "-d", "aac", rawPath, targetPath]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await loadEnv();
  const config = getConfig();
  const items = buildItems(options.onlyLetters, options.pairsOnly, options.soundsOnly, options.feedbackOnly);

  for (const accent of options.accents) {
    getVoiceType(accent);
    const accentDir = path.join(outputRoot, accent);
    await mkdir(accentDir, { recursive: true });
    console.log(`== Generating ${accent} audio ==`);

    for (const item of items) {
      const targetPath = path.join(accentDir, `${item.filename}.${config.outputFormat}`);
      if (!options.force && existsSync(targetPath)) {
        console.log(`skip ${path.relative(rootDir, targetPath)}`);
        continue;
      }

      console.log(`${options.dryRun ? "plan" : "write"} ${path.relative(rootDir, targetPath)} <- "${item.text}"`);
      if (!options.dryRun) {
        const rawAudio = await synthesize(item.text, accent, config);
        await writeAudioFile(rawAudio, targetPath, config);
        await wait(config.delayMs);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
