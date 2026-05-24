import type { Business } from '@/lib/businesses'

interface BusinessPanelProps {
  businesses: Business[]
  parcelLabel: string
  loading: boolean
  onClose: () => void
}

function formatYear(dateStr: string | null): string | null {
  if (!dateStr) return null
  const year = new Date(dateStr).getFullYear()
  return isNaN(year) ? null : String(year)
}

export default function BusinessPanel({ businesses, parcelLabel, loading, onClose }: BusinessPanelProps) {
  return (
    <div data-business-panel className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-zinc-200 shadow-xl z-1002 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 flex items-start justify-between gap-2 shrink-0">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Businesses</p>
          <p className="text-sm font-semibold text-zinc-800 leading-tight">{parcelLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none mt-0.5 shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-sm text-zinc-400">
            Loading businesses…
          </div>
        ) : businesses.length === 0 ? (
          <div className="px-4 py-6 text-sm text-zinc-400 text-center leading-relaxed">
            No active registered businesses found in this zone
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {businesses.map((b, i) => {
              const since = formatYear(b.location_start_date)
              return (
                <li key={i} className="px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-800 leading-snug">
                    {b.dba_name || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {b.naic_code_description && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                        {b.naic_code_description}
                      </span>
                    )}
                    {since && (
                      <span className="text-[10px] text-zinc-400">Since {since}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer count */}
      {!loading && businesses.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-100 shrink-0">
          <p className="text-[11px] text-zinc-400">
            {businesses.length.toLocaleString()} active {businesses.length === 1 ? 'business' : 'businesses'}
          </p>
        </div>
      )}
    </div>
  )
}
