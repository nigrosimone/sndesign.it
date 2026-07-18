/** true se l'utente preferisce ridurre le animazioni (o se matchMedia non è disponibile, es. in test). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
