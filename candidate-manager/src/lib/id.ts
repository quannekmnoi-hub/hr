export function createId(): string {
  const g = globalThis as unknown as { crypto?: Crypto }
  const c = g.crypto

  if (c?.randomUUID) {
    return c.randomUUID()
  }

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  const rand = Math.random().toString(16).slice(2, 10)
  return `id-${Date.now().toString(16)}-${rand}`
}
