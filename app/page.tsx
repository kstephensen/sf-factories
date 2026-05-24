import MapView from '@/components/MapView'

export default function Home() {
  return (
    <main className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-zinc-200 shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          SF Industrial Zoning, 1998–Today
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          How San Francisco's protected industrial zoning changed from the dot-com era to today
        </p>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        <MapView />
      </div>
    </main>
  )
}
