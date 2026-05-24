import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { isIndustrial } from '../lib/zoneFilter'

const DATASETS = [
  { year: 1998, id: 'piqy-pimd', file: '1998' },
  { year: 2000, id: 'itx2-wzp5', file: '2000' },
  { year: 2001, id: '8m6w-8yuk', file: '2001' },
  { year: 2002, id: '3yi7-eyfd', file: '2002' },
  { year: 2003, id: '6ru7-zq4y', file: '2003' },
  { year: 2004, id: 's3eh-jdwb', file: '2004' },
  { year: 2005, id: 'b52k-gy2v', file: '2005' },
  { year: 2006, id: 'afkh-hfhr', file: '2006' },
  { year: 2007, id: 'pe87-v8tx', file: '2007' },
  { year: 2008, id: 'tsdh-z53a', file: '2008' },
  { year: 2009, id: 'jud5-ja46', file: '2009' },
  { year: 2010, id: 'x4gj-zjx7', file: '2010' },
  { year: 2011, id: 'rt4q-mf68', file: '2011' },
  { year: 2012, id: 'vfz8-awmy', file: '2012' },
  { year: 2013, id: '6jb9-g73z', file: '2013' },
  { year: 2014, id: 'hg44-eza7', file: '2014' },
  { year: 2015, id: 'ada2-cu6t', file: '2015' },
  { year: 2024, id: '3i4a-hu95', file: 'current' },
]

const OUT_DIR = join(process.cwd(), 'public', 'data')

// M-1/M-2 exact prefixes (avoids catching RM-1, RM-2 residential-mixed zones)
const IND_WHERE = (col: string) =>
  `${col} LIKE 'M-1%' OR ${col} LIKE 'M-2%' OR ${col} LIKE 'PDR%' OR ${col} LIKE 'SALI%'`

async function tryFetch(url: string): Promise<Response | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (res.status === 400) return null
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res
}

async function fetchDataset(id: string, year: number, file: string) {
  const base = `https://data.sfgov.org/resource/${id}.geojson`
  console.log(`Fetching ${year} (${id})...`)

  // Try server-side filter on 'zoning', then 'zoning_sim', then unfiltered
  const attempts = [
    `${base}?$limit=50000&$where=${encodeURIComponent(IND_WHERE('zoning'))}`,
    `${base}?$limit=50000&$where=${encodeURIComponent(IND_WHERE('zoning_sim'))}`,
    `${base}?$limit=50000`,
  ]

  let geojson: { type: string; features: Array<{ properties: Record<string, unknown> }> } | null = null

  for (const url of attempts) {
    const res = await tryFetch(url)
    if (res) {
      geojson = await res.json()
      const strategy = url.includes('zoning_sim') ? '(via zoning_sim)' : url.includes('zoning') && url.includes('where') ? '(via zoning)' : '(unfiltered, client-side only)'
      console.log(`  ${strategy}`)
      break
    }
  }

  if (!geojson) throw new Error(`All fetch attempts failed for ${id}`)

  const before = geojson.features.length
  if (before === 50000) console.warn(`  ⚠ Hit 50k limit — may be incomplete`)

  geojson.features = geojson.features.filter(f => isIndustrial(f.properties, year))
  console.log(`  ${before} → ${geojson.features.length} industrial features`)

  writeFileSync(join(OUT_DIR, `${file}.geojson`), JSON.stringify(geojson))
  console.log(`  ✓ public/data/${file}.geojson`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  for (const ds of DATASETS) {
    await fetchDataset(ds.id, ds.year, ds.file)
  }
  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
