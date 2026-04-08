class AuthCache {
  private cache = new Map<string, { ok: boolean; timer: ReturnType<typeof setTimeout> }>()
  private ttl: number

  constructor(ttlMs = 60000) {
    this.ttl = ttlMs
  }

  get(apiKey: string): boolean | undefined {
    return this.cache.get(apiKey)?.ok
  }

  set(apiKey: string, ok: boolean): void {
    this.delete(apiKey)
    const timer = setTimeout(() => this.cache.delete(apiKey), this.ttl)
    this.cache.set(apiKey, { ok, timer })
  }

  delete(apiKey: string): void {
    const entry = this.cache.get(apiKey)

    if (entry) {
      clearTimeout(entry.timer)
      this.cache.delete(apiKey)
    }
  }
}

export const authCache = new AuthCache()
