import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'resources')

function createPNG(width, height, pixels) {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const o = y * (1 + width * 4) + 1 + x * 4
      raw[o] = pixels[i]
      raw[o + 1] = pixels[i + 1]
      raw[o + 2] = pixels[i + 2]
      raw[o + 3] = pixels[i + 3]
    }
  }

  const compressed = deflateSync(raw)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const ihdrChunk = makeChunk('IHDR', ihdr)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeB = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeB, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([len, typeB, data, crc])
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

function drawCircle(pixels, w, h, cx, cy, r, color) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= r) {
        const i = (y * w + x) * 4
        const alpha = dist > r - 1 ? Math.max(0, 1 - (dist - r + 1)) : 1
        pixels[i] = color[0]
        pixels[i + 1] = color[1]
        pixels[i + 2] = color[2]
        pixels[i + 3] = Math.round(color[3] * alpha)
      }
    }
  }
}

function drawFilledCircle(pixels, w, h, cx, cy, r, color) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) {
        const i = (y * w + x) * 4
        pixels[i] = color[0]
        pixels[i + 1] = color[1]
        pixels[i + 2] = color[2]
        pixels[i + 3] = color[3]
      }
    }
  }
}

function drawRect(pixels, w, h, x1, y1, x2, y2, color) {
  for (let y = Math.max(0, y1); y <= Math.min(h - 1, y2); y++) {
    for (let x = Math.max(0, x1); x <= Math.min(w - 1, x2); x++) {
      const i = (y * w + x) * 4
      pixels[i] = color[0]
      pixels[i + 1] = color[1]
      pixels[i + 2] = color[2]
      pixels[i + 3] = color[3]
    }
  }
}

const S = 44

function makeStatusIcon(fillColor) {
  const pixels = new Uint8Array(S * S * 4)
  const cx = S / 2
  const cy = S / 2
  const outerR = S * 0.42
  const innerR = S * 0.32

  drawCircle(pixels, S, S, cx, cy, outerR, [...fillColor, 255])

  drawFilledCircle(pixels, S, S, cx, cy, innerR, [255, 255, 255, 255])

  drawFilledCircle(pixels, S, S, cx, cy, S * 0.05, [...fillColor, 255])

  const handLen = innerR * 0.7
  const angle12 = -Math.PI / 2
  drawRect(pixels, S, S,
    Math.round(cx - 1), Math.round(cy - handLen),
    Math.round(cx + 1), Math.round(cy),
    [...fillColor, 255]
  )

  const handLen2 = innerR * 0.5
  const angle3 = 0
  drawRect(pixels, S, S,
    Math.round(cx), Math.round(cy - 1),
    Math.round(cx + handLen2), Math.round(cy + 1),
    [...fillColor, 255]
  )

  return createPNG(S, S, pixels)
}

function makeTemplateIcon() {
  const pixels = new Uint8Array(S * S * 4)
  const cx = S / 2
  const cy = S / 2
  const outerR = S * 0.42

  drawCircle(pixels, S, S, cx, cy, outerR, [0, 0, 0, 255])

  return createPNG(S, S, pixels)
}

function makeAppIcon() {
  const size = 512
  const pixels = new Uint8Array(size * size * 4)

  const r = size * 0.18
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inRect = x >= 0 && x < size && y >= 0 && y < size
      const inCorner = (x < r && y < r) || (x >= size - r && y < r) ||
                       (x < r && y >= size - r) || (x >= size - r && y >= size - r)

      if (inRect) {
        let inside = true
        if (x < r && y < r) inside = Math.sqrt((x - r) ** 2 + (y - r) ** 2) <= r
        else if (x >= size - r && y < r) inside = Math.sqrt((x - (size - r)) ** 2 + (y - r) ** 2) <= r
        else if (x < r && y >= size - r) inside = Math.sqrt((x - r) ** 2 + (y - (size - r)) ** 2) <= r
        else if (x >= size - r && y >= size - r) inside = Math.sqrt((x - (size - r)) ** 2 + (y - (size - r)) ** 2) <= r

        if (inside) {
          pixels[i] = 0x4F
          pixels[i + 1] = 0x46
          pixels[i + 2] = 0xE5
          pixels[i + 3] = 255
        }
      }
    }
  }

  const cx = size / 2
  const cy = size / 2
  const clockR = size * 0.3

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4

      if (dist >= clockR - size * 0.025 && dist <= clockR + size * 0.015) {
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
        pixels[i + 3] = 255
      }
    }
  }

  for (let tick = 0; tick < 12; tick++) {
    const angle = (tick / 12) * Math.PI * 2 - Math.PI / 2
    const inner = clockR * 0.75
    const outer = clockR * 0.88
    const thick = tick % 3 === 0 ? size * 0.02 : size * 0.008
    for (let t = -thick; t <= thick; t++) {
      for (let d = inner; d <= outer; d++) {
        const px = Math.round(cx + Math.cos(angle) * d + Math.sin(angle) * t)
        const py = Math.round(cy + Math.sin(angle) * d - Math.cos(angle) * t)
        if (px >= 0 && px < size && py >= 0 && py < size) {
          const i = (py * size + px) * 4
          pixels[i] = 255
          pixels[i + 1] = 255
          pixels[i + 2] = 255
          pixels[i + 3] = 255
        }
      }
    }
  }

  const handThick = size * 0.015
  for (let t = -handThick; t <= handThick; t++) {
    for (let d = 0; d <= clockR * 0.65; d++) {
      const px = Math.round(cx + t)
      const py = Math.round(cy - d)
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const i = (py * size + px) * 4
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
        pixels[i + 3] = 255
      }
    }
    for (let d = 0; d <= clockR * 0.45; d++) {
      const px = Math.round(cx + d)
      const py = Math.round(cy + t)
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const i = (py * size + px) * 4
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
        pixels[i + 3] = 255
      }
    }
  }

  const dotR = size * 0.025
  for (let y = Math.round(cy - dotR); y <= Math.round(cy + dotR); y++) {
    for (let x = Math.round(cx - dotR); x <= Math.round(cx + dotR); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= dotR * dotR) {
        const i = (y * size + x) * 4
        pixels[i] = 255
        pixels[i + 1] = 255
        pixels[i + 2] = 255
        pixels[i + 3] = 255
      }
    }
  }

  return createPNG(size, size, pixels)
}

writeFileSync(join(outDir, 'trayIconTemplate.png'), makeTemplateIcon())
writeFileSync(join(outDir, 'trayIconGreen.png'), makeStatusIcon([0x22, 0xC5, 0x5E]))
writeFileSync(join(outDir, 'trayIconYellow.png'), makeStatusIcon([0xEA, 0xB3, 0x08]))
writeFileSync(join(outDir, 'trayIconRed.png'), makeStatusIcon([0xEF, 0x44, 0x44]))
writeFileSync(join(outDir, 'icon.png'), makeAppIcon())

console.log('Icons generated!')
