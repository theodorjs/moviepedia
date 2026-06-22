import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '../public/favicon.svg')
const svg = readFileSync(svgPath, 'utf-8')

const sizes = [
  { name: 'apple-touch-icon.png', size: 180, dir: 'public' },
  { name: 'icon-192.png', size: 192, dir: 'public/icons' },
  { name: 'icon-512.png', size: 512, dir: 'public/icons' },
]

mkdirSync(join(__dirname, '../public/icons'), { recursive: true })

for (const { name, size, dir } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  const pngData = resvg.render().asPng()
  const outPath = join(__dirname, '..', dir, name)
  writeFileSync(outPath, pngData)
  console.log(`✓ ${outPath} (${size}×${size})`)
}
