/** True when the user prefers reduced motion, or when matchMedia is unavailable (e.g. in tests). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
