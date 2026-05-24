import { writeFileSync } from 'fs'
import { join } from 'path'
import { isIndustrial } from '../lib/zoneFilter'

const DATASETS = [
  { year: 1998, id: 'piqy-pimd', file: '1998' },
  { year: 2009, id: 'jud5-ja46', file: '2009' },
  { year: 2015, id: 'ada2-cu6t', file: '2015' },
  { year: 2024, id: '3i4a-hu95', file: 'current' },
]

const OUT_DIR = join(process.cwd(), 'public', 'data')

async function fetchDataset(id: string, year: number, file: string) {
  const url = `https://data.sfgov.org/resource/${id}.geojson?$limit=50000`
  console.log(`Fetching ${year} (${id})...`)

  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)

  const geojson = await res.json() as { type: string; features: Array<{ properties: Record<string, unknown> }> }

  const before = geojson.features.length
  geojson.features = geojson.features.filter(f => isIndustrial(f.properties, year))
  const after = geojson.features.length

  console.log(`  ${before} total → ${after} industrial features`)

  const outPath = join(OUT_DIR, `${file}.geojson`)
  writeFileSync(outPath, JSON.stringify(geojson))
  console.log(`  Written to public/data/${file}.geojson`)
}

async function main() {
  for (const ds of DATASETS) {
    await fetchDataset(ds.id, ds.year, ds.file)
  }
  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
