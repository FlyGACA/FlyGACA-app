// Generates Captain Adel's idle loop — `public/img/captain/avatar-live.webp`.
//
// An interim *procedural* "alive" loop: a deliberately tiny breathing motion
// (slow Ken-Burns zoom + a few-px vertical drift) synthesised from the existing
// still portrait, run ping-pong so the loop is seamless with no jump-cut. It is
// intentionally subtle — it should read as "alive", never as a zoom effect — and
// carries zero uncanny-valley risk. Drop-in replaceable by a true blink loop
// later with no code change: `CaptainAvatar` already resolves this exact path.
//
// Run: `node scripts/gen-avatar-live.mjs`  (sharp is a devDependency.)

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { statSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../public/img/captain/avatar.png'); // 500x500 source
const OUT = resolve(here, '../public/img/captain/avatar-live.webp');

// --- Tunables -------------------------------------------------------------
const SIZE = 320; // output square — covers the xl welcome avatar (104px) at 3x DPR
const FRAMES = 8; // forward frames; ping-pong ~doubles this. Animated-WebP size scales
//                   with frame *count* (lossy frames encode near-independently), not motion,
//                   so a slow breath uses few frames — lighter, and still smooth.
const FPS = 8; // playback rate (slow, subtle breath)
const MAX_ZOOM = 1.03; // peak Ken-Burns zoom (1.0 = none) — amplitude is ~size-neutral
const DRIFT_PX = 5; // peak vertical drift, in source px, at full zoom
const QUALITY = 70; // starting WebP quality; auto-tuned down to fit the budget
const QUALITY_FLOOR = 40; // don't degrade past this chasing the budget
const MAX_BYTES = 400 * 1024; // hard budget — stay well under the 4 MB SW cap
// -------------------------------------------------------------------------

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function buildFrame(src, srcSize, phase) {
  // Cosine ease 0..1 — zero velocity at both turning points, so the ping-pong
  // seam is invisible.
  const ease = (1 - Math.cos(phase * Math.PI)) / 2;
  const zoom = 1 + (MAX_ZOOM - 1) * ease;
  const crop = Math.round(srcSize / zoom);
  const room = srcSize - crop;
  const dy = DRIFT_PX * ease;
  const left = clamp(Math.round(room / 2), 0, room);
  const top = clamp(Math.round(room / 2 - dy), 0, room);

  return sharp(src)
    .extract({ left, top, width: crop, height: crop })
    .resize(SIZE, SIZE, { fit: 'fill' })
    .png()
    .toBuffer();
}

async function main() {
  const meta = await sharp(SRC).metadata();
  const srcSize = Math.min(meta.width, meta.height);

  // Forward pass: still (phase 0) -> peak breath (phase 1).
  const forward = [];
  for (let i = 0; i < FRAMES; i++) {
    forward.push(await buildFrame(SRC, srcSize, i / (FRAMES - 1)));
  }
  // Ping-pong: append the reverse without the two endpoints (already the turns).
  const seq = [...forward, ...forward.slice(1, -1).reverse()];
  const delay = Math.round(1000 / FPS);

  // Encode, auto-tuning quality down until the loop fits the byte budget. A
  // photoreal Ken-Burns zoom shifts every pixel each frame, so it compresses
  // poorly — better to shed a little quality than to blow the cache budget.
  let quality = QUALITY;
  let size;
  for (;;) {
    await sharp(seq, { join: { animated: true } })
      .webp({ loop: 0, delay, quality, effort: 6 })
      .toFile(OUT);
    size = statSync(OUT).size;
    if (size <= MAX_BYTES || quality <= QUALITY_FLOOR) break;
    quality -= 6;
  }

  const out = await sharp(OUT).metadata();
  console.log(
    `wrote ${OUT}\n  ${out.width}x${out.height} • ${out.pages} frames • ` +
      `q${quality} • ${(size / 1024).toFixed(1)} KB • loop=${out.loop}`,
  );
  if (size > MAX_BYTES) {
    throw new Error(
      `avatar-live.webp is ${(size / 1024).toFixed(1)} KB at q${quality} (floor) — over the ${MAX_BYTES / 1024} KB budget`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
