export function isIndustrial(props: Record<string, unknown>, year: number): boolean {
  const fields = ['zoning_sim', 'zoning', 'districtname', 'gen', 'district_name', 'zone_class']
  const val = fields.map(f => String(props[f] ?? '')).join(' ').toLowerCase()
  if (year < 2005) {
    // Pre-PDR era: SF used M-1 (Light Industrial) and M-2 (Heavy Industrial) designations
    return /\bm-?[12]\b/.test(val) || /industrial|manufactur/.test(val)
  }
  // Post-Eastern-Neighborhoods plan: PDR (Production, Distribution, Repair)
  return /\bpdr/.test(val) || /industrial|manufactur/.test(val)
}
