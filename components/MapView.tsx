'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, PathOptions } from 'leaflet'

const YEARS = [
  { label: '1998', file: '1998', description: 'Dot-com era — M-1/M-2 industrial districts' },
  { label: '2009', file: '2009', description: 'Post-Eastern Neighborhoods plan — PDR zones introduced' },
  { label: '2015', file: '2015', description: 'Mid-decade — PDR consolidation' },
  { label: 'Today', file: 'current', description: 'Current zoning (PDR + legacy M-1/M-2)' },
] as const

const FILL_COLOR = '#e05533'
const FILL_OPACITY = 0.55
const STROKE_COLOR = '#b03a1e'
const STROKE_WEIGHT = 0.8

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

      // Fix default icon paths broken by bundlers — must cast through unknown
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
      setMapReady(true) // triggers the layer-loading effect
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Load and swap GeoJSON layer when year changes or map becomes ready
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const file = YEARS[yearIndex].file
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

        if (layerRef.current) {
          map.removeLayer(layerRef.current)
        }

        const style: PathOptions = {
          color: STROKE_COLOR,
          weight: STROKE_WEIGHT,
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

    return () => {
      cancelled = true
    }
  }, [yearIndex, mapReady])

  const year = YEARS[yearIndex]

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Map — absolute fill so Leaflet gets a real pixel height */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute top-3 right-3 z-[1000] bg-white/90 rounded px-3 py-1 text-sm shadow">
            Loading…
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white border-t px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold tabular-nums">{year.label}</span>
          <span className="text-sm text-zinc-500">
            {featureCount !== null ? `${featureCount} industrial parcels` : ''}
          </span>
        </div>

        <p className="text-sm text-zinc-600 -mt-1">{year.description}</p>

        <input
          type="range"
          min={0}
          max={YEARS.length - 1}
          step={1}
          value={yearIndex}
          onChange={e => setYearIndex(Number(e.target.value))}
          className="w-full accent-[#e05533] cursor-pointer"
        />

        <div className="flex justify-between text-xs text-zinc-400 -mt-1">
          {YEARS.map((y, i) => (
            <button
              key={y.file}
              onClick={() => setYearIndex(i)}
              className={`transition-colors ${i === yearIndex ? 'text-zinc-900 font-medium' : 'hover:text-zinc-700'}`}
            >
              {y.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-400 border-t pt-2 mt-1">
          This map shows zoning districts, not actual factory locations or jobs.
          Data:{' '}
          <a
            href="https://data.sfgov.org"
            className="underline hover:text-zinc-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            DataSF
          </a>
          .
        </p>
      </div>
    </div>
  )
}
