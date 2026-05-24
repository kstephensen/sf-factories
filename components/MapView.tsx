'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet'

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


function getDescription(year: number): string {
  if (year <= 2003) return 'Dot-com era — parcel-level M-1/M-2 industrial zones'
  if (year <= 2005) return 'Eastern Neighborhoods planning begins'
  if (year <= 2008) return 'Eastern Neighborhoods plan in development'
  if (year === 2009) return 'Eastern Neighborhoods Plan adopted — PDR zones take effect'
  if (year <= 2014) return 'PDR consolidation — district-level industrial protection'
  if (year === 2015) return 'Post-Eastern Neighborhoods — stabilized PDR districts'
  return 'Today — current PDR + legacy M-1/M-2 zoning'
}

const FILL_COLOR = '#e05533'
const FILL_OPACITY = 0.55
const STROKE_COLOR = '#b03a1e'

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [yearIndex, setYearIndex] = useState(0)
  const [featureCount, setFeatureCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Initialize Leaflet map on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

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

    return () => { cancelled = true }
  }, [])

  // Load and swap GeoJSON layer when year or map readiness changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const { file, year } = YEARS[yearIndex]
    let cancelled = false

    async function loadLayer() {
      setLoading(true)
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

        // Pre-2010 datasets are parcel-level (many small polygons), use thinner strokes
        const isParcelLevel = year < 2010
        const style: PathOptions = {
          color: STROKE_COLOR,
          weight: isParcelLevel ? 0.4 : 0.8,
          fillColor: FILL_COLOR,
          fillOpacity: FILL_OPACITY,
        }

        const layer = L.geoJSON(geojson, {
          style: () => style,
          onEachFeature(feature, lyr) {
            const p = feature.properties as Record<string, string>
            const label = p.zoning_sim || p.zoning || p.districtna || 'Industrial zone'
            lyr.bindTooltip(label, { sticky: true })
          },
        }).addTo(map)

        layerRef.current = layer
        setFeatureCount(geojson.features.length)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLayer()
    return () => { cancelled = true }
  }, [yearIndex, mapReady])

  const { year } = YEARS[yearIndex]
  const label = year === 2024 ? 'Today' : String(year)

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute top-3 right-3 z-1000 bg-white/90 rounded px-3 py-1 text-sm shadow">
            Loading…
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t px-6 py-4 flex flex-col gap-2 shrink-0">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold tabular-nums">{label}</span>
          <span className="text-sm text-zinc-500">
            {featureCount !== null ? `${featureCount.toLocaleString()} industrial features` : ''}
          </span>
        </div>

        <p className="text-sm text-zinc-500">{getDescription(year)}</p>

        {/* Slider */}
        <div className="pt-1">
          <input
            type="range"
            min={0}
            max={YEARS.length - 1}
            step={1}
            value={yearIndex}
            onChange={e => setYearIndex(Number(e.target.value))}
            className="w-full accent-[#e05533] cursor-pointer"
          />
          {/* Tick labels — every other year */}
          <div className="relative h-5 mt-1">
            {YEARS.map(({ year: y }, i) => {
              if (i % 2 !== 0 && i !== YEARS.length - 1) return null
              const pct = (i / (YEARS.length - 1)) * 100
              const tickLabel = y === 2024 ? 'Today' : String(y)
              return (
                <button
                  key={y}
                  onClick={() => setYearIndex(i)}
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                  className={`absolute text-xs whitespace-nowrap transition-colors ${
                    i === yearIndex ? 'text-zinc-900 font-medium' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {tickLabel}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-zinc-400 border-t pt-2 mt-1">
          Note: pre-2010 data is parcel-level (individual lots); 2010+ is district-level (PDR zones). Both show industrial-designated land.{' '}
          Data: <a href="https://data.sfgov.org" className="underline hover:text-zinc-600" target="_blank" rel="noopener noreferrer">DataSF</a>.
        </p>
      </div>
    </div>
  )
}
