'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, PathOptions, Layer, Path } from 'leaflet'
import turfArea from '@turf/area'
import { filterBusinessesInParcel, type Business } from '@/lib/businesses'
import BusinessPanel from './BusinessPanel'

const YEARS = [
  { year: 1998, file: '1998' },
  { year: 2000, file: '2000' },
  { year: 2001, file: '2001' },
  { year: 2002, file: '2002' },
  { year: 2003, file: '2003' },
  { year: 2004, file: '2004' },
  { year: 2005, file: '2005' },
  { year: 2006, file: '2006' },
  { year: 2007, file: '2007' },
  { year: 2008, file: '2008' },
  { year: 2009, file: '2009' },
  { year: 2010, file: '2010' },
  { year: 2011, file: '2011' },
  { year: 2012, file: '2012' },
  { year: 2013, file: '2013' },
  { year: 2014, file: '2014' },
  { year: 2015, file: '2015' },
  { year: 2024, file: 'current' },
] as const

function getEra(year: number) {
  if (year <= 2003) return { name: 'Dot-com era', color: '#71717a', bg: '#f4f4f5', text: '#3f3f46' }
  if (year <= 2008) return { name: 'Planning transition', color: '#d97706', bg: '#fef3c7', text: '#92400e' }
  if (year === 2009) return { name: 'Plan adopted', color: '#0284c7', bg: '#e0f2fe', text: '#0c4a6e' }
  if (year <= 2015) return { name: 'PDR consolidation', color: '#16a34a', bg: '#dcfce7', text: '#14532d' }
  return { name: 'Current zoning', color: '#7c3aed', bg: '#ede9fe', text: '#4c1d95' }
}

function getDescription(year: number): string {
  if (year <= 2003) return 'M-1 and M-2 manufacturing zones mapped at the individual parcel level. This was San Francisco\'s traditional approach to industrial land protection during the dot-com boom.'
  if (year <= 2005) return 'Rising development pressure from residential and office conversions prompts the city to begin the Eastern Neighborhoods Area Plan — a rethink of how industrial land gets protected.'
  if (year <= 2008) return 'The Eastern Neighborhoods plan takes shape. Planners propose replacing parcel-by-parcel M-1/M-2 designations with larger "PDR" (Production, Distribution & Repair) districts.'
  if (year === 2009) return 'The Eastern Neighborhoods Plan is adopted. PDR zones replace parcel-level M-1/M-2 designations — fewer features on the map, but each covers far more land. This is why the feature count drops sharply.'
  if (year <= 2014) return 'PDR districts are consolidated and stabilized across the Eastern Neighborhoods, Showplace Square, and central waterfront. Industrial land is now protected at the district scale.'
  if (year === 2015) return 'Post-Eastern Neighborhoods zoning reaches its stable form. PDR districts are defined citywide alongside remaining legacy M-1/M-2 parcels.'
  return 'Today\'s industrial land — a mix of PDR districts established in 2009 and legacy M-1/M-2 parcels that predate the Eastern Neighborhoods Plan.'
}

const FILL_COLOR = '#e05533'
const FILL_OPACITY = 0.55
const STROKE_COLOR = '#b03a1e'

const SELECTED_STYLE: PathOptions = {
  fillColor: '#b83420',
  fillOpacity: 0.85,
  color: '#7f1d1d',
  weight: 2,
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  const selectedFeatureRef = useRef<Layer | null>(null)
  const defaultStyleRef = useRef<PathOptions>({})
  const featureWasClickedRef = useRef(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const drawerPanRef = useRef(0)
  const [mapReady, setMapReady] = useState(false)
  const [yearIndex, setYearIndex] = useState(YEARS.length - 1)
  const [featureCount, setFeatureCount] = useState<number | null>(null)
  const [totalAcres, setTotalAcres] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyOpenRef = useRef(false)
  const businessesRef = useRef<Business[] | null>(null)
  const businessFetched = useRef(false)
  const [businessLoading, setBusinessLoading] = useState(false)
  const [selectedBusinesses, setSelectedBusinesses] = useState<Business[] | null>(null)
  const [selectedParcelLabel, setSelectedParcelLabel] = useState('')

  // Keep historyOpenRef current so Leaflet click handlers (stale closures) can read it
  useEffect(() => {
    historyOpenRef.current = historyOpen
  }, [historyOpen])

  // Prefetch business data when entering current view
  useEffect(() => {
    if (historyOpen) return
    if (businessFetched.current) return
    businessFetched.current = true
    setBusinessLoading(true)
    fetch('/api/businesses')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Business[]> })
      .then(data => { businessesRef.current = data })
      .catch(() => { businessFetched.current = false })
      .finally(() => setBusinessLoading(false))
  }, [historyOpen])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    const onDocClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('[data-business-panel]')) return
      if (!featureWasClickedRef.current && selectedFeatureRef.current) {
        ;(selectedFeatureRef.current as unknown as Path).setStyle(defaultStyleRef.current)
        selectedFeatureRef.current = null
        setSelectedBusinesses(null)
      }
      featureWasClickedRef.current = false
    }
    document.addEventListener('click', onDocClick)

    import('leaflet').then((mod) => {
      if (cancelled || !containerRef.current) return
      const L = mod.default

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, {
        center: [37.758, -122.44],
        zoom: 12,
        zoomControl: true,
        zoomSnap: 0.5,
        zoomDelta: 0.25,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      document.removeEventListener('click', onDocClick)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    if (historyOpen) {
      const height = drawerRef.current?.offsetHeight ?? 0
      const panY = Math.round(height / 2)
      drawerPanRef.current = panY
      map.panBy([0, panY], { animate: true, duration: 0.3 })
    } else if (drawerPanRef.current) {
      map.panBy([0, -drawerPanRef.current], { animate: true, duration: 0.3 })
      drawerPanRef.current = 0
    }
  }, [historyOpen])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const { file, year } = YEARS[yearIndex]
    let cancelled = false

    async function loadLayer() {
      setLoading(true)
      selectedFeatureRef.current = null
      setSelectedBusinesses(null)
      try {
        const [mod, res] = await Promise.all([
          import('leaflet'),
          fetch(`/data/${file}.geojson`),
        ])
        if (cancelled) return
        const L = mod.default
        const map = mapRef.current
        if (!map) return

        const geojson = await res.json()
        if (cancelled) return

        if (layerRef.current) map.removeLayer(layerRef.current)

        const isParcelLevel = year < 2010
        const style: PathOptions = {
          color: STROKE_COLOR,
          weight: isParcelLevel ? 0.4 : 0.8,
          fillColor: FILL_COLOR,
          fillOpacity: FILL_OPACITY,
        }
        defaultStyleRef.current = style

        const layer = L.geoJSON(geojson, {
          style: () => style,
          onEachFeature(feature, lyr) {
            const p = feature.properties as Record<string, string>
            const label = p.zoning_sim || p.zoning || p.districtna || 'Industrial zone'
            lyr.bindTooltip(label, { sticky: true })

            lyr.on('click', () => {
              featureWasClickedRef.current = true
              const wasSelected = selectedFeatureRef.current === lyr

              if (selectedFeatureRef.current && selectedFeatureRef.current !== lyr) {
                ;(selectedFeatureRef.current as unknown as Path).setStyle(style)
              }
              if (wasSelected) {
                // Deselect on second click
                ;(lyr as unknown as Path).setStyle(style)
                selectedFeatureRef.current = null
                setSelectedBusinesses(null)
              } else {
                ;(lyr as unknown as Path).setStyle({
                  ...SELECTED_STYLE,
                  weight: isParcelLevel ? 1.5 : 2.5,
                })
                selectedFeatureRef.current = lyr

                // Show business panel in current view only
                if (!historyOpenRef.current) {
                  setSelectedParcelLabel(label)
                  if (businessesRef.current) {
                    setSelectedBusinesses(
                      filterBusinessesInParcel(
                        businessesRef.current,
                        feature as Parameters<typeof filterBusinessesInParcel>[1]
                      )
                    )
                  } else {
                    // Data still loading — show panel with loading state
                    setSelectedBusinesses([])
                  }
                }
              }
            })
          },
        }).addTo(map)

        type GeoFeature = { geometry: unknown; properties: Record<string, string> }

        // Deduplicate by parcel ID for both count and area — keeps first occurrence only
        const seenIds = new Set<string>()
        const uniqueFeatures = (geojson.features as GeoFeature[]).filter((f) => {
          const id = f.properties.mapblklot || f.properties.blklot
          if (!id) return true
          if (seenIds.has(id)) return false
          seenIds.add(id)
          return true
        })

        layerRef.current = layer
        setFeatureCount(uniqueFeatures.length)
        const featuresWithGeometry = uniqueFeatures.filter((f) => f.geometry != null)
        const sqMeters = turfArea({ ...geojson, features: featuresWithGeometry })
        setTotalAcres(sqMeters / 4046.856)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLayer()
    return () => { cancelled = true }
  }, [yearIndex, mapReady])

  const { year } = YEARS[yearIndex]
  const era = getEra(year)
  const isParcelLevel = year < 2010
  const displayYear = year === 2024 ? 'Today' : String(year)

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Map — fills all available space */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {loading && (
          <div className="absolute top-3 right-3 z-1000 bg-white/95 rounded-lg px-3 py-1.5 text-xs text-zinc-500 shadow-sm border border-zinc-200/70">
            Loading…
          </div>
        )}

        {/* Floating "See Changes Over Time" button — top-right */}
        <button
          onClick={() => setHistoryOpen(true)}
          className={`absolute top-3 right-3 z-1000 flex items-center gap-1.5 bg-white border border-zinc-200 shadow-md rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 transition-all duration-200 ${
            historyOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          See Changes Over Time
        </button>

        {/* Business info panel — slides in from right when a parcel is selected in current view */}
        {selectedBusinesses !== null && (
          <BusinessPanel
            businesses={selectedBusinesses}
            parcelLabel={selectedParcelLabel}
            loading={businessLoading}
            onClose={() => setSelectedBusinesses(null)}
          />
        )}

        {/* History drawer — absolute overlay sliding up from the bottom */}
        <div
          ref={drawerRef}
          className={`absolute inset-x-0 bottom-0 z-1001 bg-white border-t border-zinc-200 shadow-xl transition-transform duration-300 ease-in-out ${
            historyOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Drawer header */}
          <div className="px-6 pt-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              History
            </span>
            <button
              onClick={() => {
                setHistoryOpen(false)
                setYearIndex(YEARS.length - 1)
              }}
              className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none"
              aria-label="Close history"
            >
              ×
            </button>
          </div>

          {/* Era color bar */}
          <div className="h-1 w-full mt-3 transition-colors duration-300" style={{ background: era.color }} />

          <div className="px-6 py-4 flex flex-col gap-3">
            {/* Year + era + count row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
                  {displayYear}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: era.bg, color: era.text }}
                >
                  {era.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full border"
                  style={{
                    color: isParcelLevel ? '#92400e' : '#1e40af',
                    background: isParcelLevel ? '#fef3c7' : '#dbeafe',
                    borderColor: isParcelLevel ? '#fde68a' : '#bfdbfe',
                  }}
                >
                  {isParcelLevel ? 'Parcel-level' : 'District-level'}
                </span>
              </div>
              {featureCount !== null && (
                <div className="text-right shrink-0 flex items-baseline gap-4">
                  <div>
                    <span className="text-lg font-semibold tabular-nums text-zinc-800">
                      {featureCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-400 ml-1.5">
                      {isParcelLevel ? 'parcels' : 'districts'}
                    </span>
                  </div>
                  {totalAcres !== null && (
                    <div>
                      <span className="text-lg font-semibold tabular-nums text-zinc-800">
                        {Math.round(totalAcres).toLocaleString()}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1.5">acres</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-600 leading-relaxed -mt-1">
              {getDescription(year)}
            </p>

            {/* Slider */}
            <div className="pt-1">
              <input
                type="range"
                min={0}
                max={YEARS.length - 1}
                step={1}
                value={yearIndex}
                onChange={e => setYearIndex(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: era.color }}
              />
              {/* Tick labels */}
              <div className="relative h-5 mt-0.5">
                {YEARS.map(({ year: y }, i) => {
                  if (i % 2 !== 0 && i !== YEARS.length - 1) return null
                  const pct = (i / (YEARS.length - 1)) * 100
                  const tickLabel = y === 2024 ? 'Today' : String(y)
                  return (
                    <button
                      key={y}
                      onClick={() => setYearIndex(i)}
                      style={{
                        left: `${pct}%`,
                        transform: 'translateX(-50%)',
                        color: i === yearIndex ? era.color : undefined,
                      }}
                      className={`absolute text-[11px] whitespace-nowrap transition-colors ${
                        i === yearIndex ? 'font-semibold' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {tickLabel}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer: legend swatch + source */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2.5 mt-0.5">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className="inline-block w-4 h-3 rounded-sm shrink-0"
                  style={{ background: FILL_COLOR, opacity: 0.75, outline: `1px solid ${STROKE_COLOR}` }}
                />
                <span>
                  {isParcelLevel ? 'M-1 / M-2 industrial zones (parcel boundaries)' : 'PDR districts — Production, Distribution & Repair'}
                </span>
              </div>
              <a
                href="https://data.sfgov.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors shrink-0 ml-4 underline underline-offset-2"
              >
                Source: DataSF
              </a>
            </div>

            {/* Parcel-to-district transition note */}
            {year === 2009 && (
              <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 leading-relaxed">
                <strong>Note:</strong> Starting in 2009, data switches from individual parcel records to district-level zones. The drop in feature count reflects this change in data type, not a loss of industrial land.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
