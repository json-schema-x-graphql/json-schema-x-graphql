#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const DOCS_DIR = path.resolve(process.cwd(), 'docs')
const OUT_DIR = path.resolve(process.cwd(), 'src/data/generated')
const OUT_FILE = path.join(OUT_DIR, 'docs-index.json')

function slugFromPath(filePath) {
  const rel = path.relative(DOCS_DIR, filePath)
  const parts = rel.split(path.sep)
  return '/docs/' + parts.join('/').replace(/\.mdx?$/i, '').replace(/README$/i, '')
}

function titleFromFilename(name) {
  // Remove extension and replace dashes/underscores with spaces and titlecase
  const base = name.replace(/\.mdx?$/i, '')
  const clean = base.replace(/[\-_]/g, ' ')
  return clean.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let files = []
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) files = files.concat(walkDir(p))
    else if (/\.mdx?$/i.test(e.name)) files.push(p)
  }
  return files
}

function classify(filePath) {
  const rel = path.relative(DOCS_DIR, filePath)
  const parts = rel.split(path.sep)
  if (parts.includes('archived') || parts.includes('deprecated')) return 'archived'
  if (parts.includes('adr')) return 'adr'
  if (parts.includes('external')) return 'external'
  return 'active'
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  const mdFiles = walkDir(DOCS_DIR)
  const docs = mdFiles.map(fp => {
    const rel = path.relative(DOCS_DIR, fp)
    const parts = rel.split(path.sep)
    const name = path.basename(fp)
    const title = titleFromFilename(name === 'README.md' ? parts[parts.length-2] || 'Docs' : name)
    return {
      title,
      href: slugFromPath(fp),
      filepath: fp.replace(process.cwd() + path.sep, ''),
      category: classify(fp),
      order: 0
    }
  })

  // Sort by category then title
  docs.sort((a,b) => (a.category + a.title).localeCompare(b.category + b.title))

  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), docs }, null, 2))
  console.log('Wrote', OUT_FILE)
}

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  // invoked directly: `node scripts/generate-docs-index.mjs`
  main()
}
