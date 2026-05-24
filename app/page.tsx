import MapView from '@/components/MapView'

export default function Home() {
  return (
    <main className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-zinc-200/80 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#e05533] mb-1.5">
          San Francisco · Industrial Land Policy
        </p>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          SF Industrial Zones
        </h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
          Current protected manufacturing and PDR districts in San Francisco.
        </p>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <MapView />
      </div>
    </main>
  )
}
