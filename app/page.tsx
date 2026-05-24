import MapView from '@/components/MapView'

export default function Home() {
  return (
    <main className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-zinc-200/80 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#e05533] mb-1.5">
          San Francisco · Industrial Land Policy
        </p>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Industrial Zoning Over Time
          </h1>
          <span className="text-base font-normal text-zinc-400 tabular-nums">
            1998 – Today
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
          Trace 25 years of land-use policy — from parcel-level M&#8209;1/M&#8209;2 manufacturing zones to consolidated PDR districts. Drag the timeline to explore.
        </p>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <MapView />
      </div>
    </main>
  )
}
