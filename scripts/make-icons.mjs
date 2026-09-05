/**
 * Generates the PWA icons as PNGs with no image dependencies.
 * Draws the System gate mark: a glowing diamond outline on the app background.
 * Run: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"

const BG = [5, 7, 13]
const GLOW = [77, 168, 255]
const XP = [0, 229, 255]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))))

/** Diamond outline with an inner bar, glowing outward. `inset` leaves maskable padding. */
const mark = (inset, transparent) => (x, y, size) => {
  const c = size / 2
  const nx = (x - c + 0.5) / (c * inset)
  const ny = (y - c + 0.5) / (c * inset)
  const d = Math.abs(nx) + Math.abs(ny) // diamond distance
  const edge = Math.abs(d - 0.82)
  const line = Math.max(0, 1 - edge / 0.055)
  const glow = Math.max(0, 1 - edge / 0.34) ** 2.2
  const bar = Math.abs(ny) < 0.055 && Math.abs(nx) < 0.34 ? 1 : 0
  const ink = Math.max(line, bar)
  const alpha = transparent ? Math.max(ink, glow * 0.55) : 1
  const base = transparent ? [0, 0, 0] : BG
  const lit = mix(mix(base, GLOW, glow * 0.75), XP, ink)
  return [...lit, Math.round(alpha * 255)]
}

mkdirSync("public", { recursive: true })
const files = [
  ["public/icon-192.png", png(192, mark(0.86, false))],
  ["public/icon-512.png", png(512, mark(0.86, false))],
  ["public/icon-maskable-512.png", png(512, mark(0.62, false))],
  ["public/apple-touch-icon.png", png(180, mark(0.86, false))],
  ["public/favicon.png", png(64, mark(0.9, true))],
]
for (const [path, buf] of files) {
  writeFileSync(path, buf)
  console.log(`${path} ${buf.length} bytes`)
}
