import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

export interface Business {
  dba_name: string
  location_start_date: string | null
  naic_code_description: string | null
  lng: number
  lat: number
}

// Infer the polygon parameter type from the function so we don't need @types/geojson directly
type PolygonArg = Parameters<typeof booleanPointInPolygon>[1]

export function filterBusinessesInParcel(
  businesses: Business[],
  parcelFeature: PolygonArg
): Business[] {
  const matches = businesses.filter(b =>
    booleanPointInPolygon(point([b.lng, b.lat]), parcelFeature)
  )

  // A business can have multiple registered locations within the same parcel.
  // Deduplicate by name, keeping the oldest registration (longest tenure).
  const seen = new Map<string, Business>()
  for (const b of matches) {
    const key = b.dba_name.toLowerCase().trim()
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, b)
    } else if (b.location_start_date && (!existing.location_start_date || b.location_start_date < existing.location_start_date)) {
      seen.set(key, b)
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (!a.location_start_date && !b.location_start_date) return a.dba_name.localeCompare(b.dba_name)
    if (!a.location_start_date) return 1
    if (!b.location_start_date) return -1
    return a.location_start_date < b.location_start_date ? -1 : 1
  })
}
