export function isIndustrial(props: Record<string, unknown>, year: number): boolean {
  // 2008 Eastern Neighborhoods dataset has a dedicated boolean field
  if (props['industrial'] === true || props['industrial'] === 1 || props['industrial'] === '1') {
    return true
  }

  const fields = ['zoning_sim', 'zoning', 'zoning_gen', 'districtname', 'district_name', 'gen', 'zone_class']
  const val = fields.map(f => String(props[f] ?? '')).join(' ').toLowerCase()

  if (year < 2005) {
    // Pre-PDR era: M-1 (Light Industrial) and M-2 (Heavy Industrial)
    return /\bm-?[12]\b/.test(val) || /industrial|manufactur/.test(val)
  }
  // Eastern Neighborhoods onward: PDR (Production, Distribution, Repair) + legacy M-1/M-2
  return /\bpdr/.test(val) || /\bm-?[12]\b/.test(val) || /industrial|manufactur/.test(val)
}
