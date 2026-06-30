import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  const inputDir = 'public/icons/classes'
  const outputDir = 'public/icons/classes-transparent'
  mkdirSync(outputDir, { recursive: true })

  const files = readdirSync(inputDir).filter(f => f.endsWith('.webp'))
  console.log(`Processing ${files.length} icons...`)

  let ok = 0
  for (const file of files) {
    try {
      const inputPath = join(inputDir, file)
      const outputPath = join(outputDir, file)
      
      // Get raw pixel data
      const { data, info } = await sharp(inputPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      
      // Make dark pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r < 30 && g < 30 && b < 30) {
          data[i + 3] = 0
        }
      }
      
      // Write back
      await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 }
      })
        .webp({ quality: 90 })
        .toFile(outputPath)
      
      ok++
    } catch (err) {
      console.error(`  ✗ ${file}: ${(err as Error).message}`)
    }
  }
  console.log(`Done: ${ok}/${files.length} icons made transparent`)
}

main().catch(console.error)
