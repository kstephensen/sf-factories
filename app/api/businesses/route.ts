import { unstable_cache } from 'next/cache'
import type { Business } from '@/lib/businesses'

// SODA 2.0 GeoJSON endpoint is hard-capped at 50k rows per request.
// Fetch 3 pages in parallel to cover the ~128k active business records.
const BATCH = 50_000
const BASE_URL =
  `https://data.sfgov.org/resource/g8m3-pdis.geojson` +
  `?$limit=${BATCH}&$order=uniqueid&$where=location_end_date+IS+NULL`

const fetchBusinesses = unstable_cache(
  async (): Promise<Business[]> => {
    const offsets = [0, 50_000, 100_000]
    const pages = await Promise.all(
      offsets.map(offset =>
        fetch(`${BASE_URL}&$offset=${offset}`, { signal: AbortSignal.timeout(30_000) })
          .then(r => { if (!r.ok) throw new Error(`SF Gov API error: ${r.status}`); return r.json() })
      )
    )

    const result: Business[] = []
    for (const page of pages) {
      for (const feature of (page.features ?? [])) {
        const p = feature.properties as Record<string, string | null>
        const geom = feature.geometry
        if (!geom || geom.type !== 'Point') continue
        const [lng, lat] = geom.coordinates as [number, number]
        result.push({
          dba_name: p.dba_name ?? '',
          location_start_date: p.location_start_date ?? null,
          naic_code_description: p.naic_code_description ?? null,
          lng,
          lat,
        })
      }
    }
    return result
  },
  ['sf-businesses'],
  { revalidate: 3600 }
)

export async function GET() {
  try {
    const businesses = await fetchBusinesses()
    return Response.json(businesses)
  } catch {
    return Response.json({ error: 'Failed to fetch business data' }, { status: 500 })
  }
}
