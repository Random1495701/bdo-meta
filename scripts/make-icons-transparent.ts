import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

async function makeTransparent(inputPath: string, outputPath: string) {
  // The class icons have a dark background. We'll make near-black pixels transparent.
  // Threshold: pixels where R+G+B < 30 (very dark) become transparent.
  await sharp(inputPath)
    .webp({ quality: 90 })
    .composite([{
      input: Buffer.from(`
        <svg width="1" height="1">
          <rect width="1" height="1" fill="black" fill-opacity="0"/>
        </svg>
      `),
      blend: 'dest-in',
    }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithDepth: false })
    .then(async (data) => {
      // Process raw pixels to make dark areas transparent
      const pixels = data
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        // If pixel is very dark (background), make it transparent
        if (r < 25 && g < 25 && b < 25) {
          pixels[i + 3] = 0 // Set alpha to 0
        }
      }
      // Get image metadata for dimensions
      const meta = await sharp(inputPath).metadata()
      await sharp(pixels, {
        raw: { width: meta.width!, height: meta.height!, channels: 4 }
      })
        .webp({ quality: 90 })
        .toFile(outputPath)
    })
}

async function main() {
  const inputDir = 'public/icons/classes'
  const outputDir = 'public/icons/classes-transparent'
  mkdirSync(outputDir, { recursive: true })

  const files = readdirSync(inputDir).filter(f => f.endsWith('.webp'))
  console.log(`Processing ${files.length} icons...`)

  let ok = 0
  for (const file of files) {
    try {
      await makeTransparent(join(inputDir, file), join(outputDir, file))
      ok++
    } catch (err) {
      console.error(`  ✗ ${file}: ${(err as Error).message}`)
    }
  }
  console.log(`Done: ${ok}/${files.length} icons made transparent`)
}

main().catch(console.error)
