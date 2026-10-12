import type { AuthTokenResponse } from '../types/auth'
import { authApi } from '../api/auth-api'
import { ApiError } from '../api/http'

const key = 'momentte.auth.session'
function valid(value: unknown): value is AuthTokenResponse {
  if (!value || typeof value !== 'object') return false
  const session = value as AuthTokenResponse
  return typeof session.accessToken === 'string' && Boolean(session.accessToken) && session.tokenType === 'Bearer' &&
    typeof session.refreshToken === 'string' && Boolean(session.refreshToken) &&
    Number.isFinite(Date.parse(session.expiresAt)) && Date.parse(session.refreshExpiresAt) > Date.now() &&
    typeof session.user?.id === 'string' && typeof session.user?.name === 'string' && typeof session.user?.email === 'string'
}
class AuthStore extends EventTarget {
  private value: AuthTokenResponse | null = null
  private timer = 0
  private refreshPromise: Promise<boolean> | null = null
  private generation = 0
  constructor() {
    super()
    try { const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null'); if (valid(stored)) this.value = stored; else sessionStorage.removeItem(key) } catch { /* Armazenamento pode estar bloqueado. */ }
    this.schedule()
    window.addEventListener('focus', this.resume)
    window.addEventListener('online', this.resume)
    document.addEventListener('visibilitychange', this.resume)
  }
  get session() { return this.value && valid(this.value) ? this.value : null }
  apply(response: AuthTokenResponse) {
    if (!valid(response) || Date.parse(response.expiresAt) <= Date.now()) throw new Error('A resposta de autenticação está incompleta ou expirada. Tente novamente.')
    this.generation++
    this.refreshPromise = null
    this.value = response
    this.persist()
  }
  clear() {
    this.generation++
    this.refreshPromise = null
    this.value = null
    window.clearTimeout(this.timer)
    try { sessionStorage.removeItem(key) } catch { /* Armazenamento pode estar bloqueado. */ }
    this.dispatchEvent(new Event('change'))
  }
  refresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise
    if (!this.session) { this.clear(); return Promise.resolve(false) }
    const current = this.value!
    const generation = this.generation
    const promise = this.runRefresh(current, generation)
    this.refreshPromise = promise
    void promise.finally(() => { if (this.refreshPromise === promise) this.refreshPromise = null })
    return promise
  }
  private async runRefresh(current: AuthTokenResponse, generation: number) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    try {
      const response = await authApi.refreshToken(current.refreshToken, controller.signal)
      if (generation !== this.generation) {
        await this.revoke(response.refreshToken)
        return false
      }
      if (!valid(response) || Date.parse(response.expiresAt) <= Date.now()) { this.clear(); return false }
      this.value = response
      this.persist()
      return true
    } catch (error) {
      if (generation !== this.generation) return false
      if (error instanceof ApiError && (error.status === 400 || error.status === 401)) this.clear()
      else if (!this.session) this.clear()
      else this.timer = window.setTimeout(() => { void this.refresh() }, 60000)
      return false
    } finally { window.clearTimeout(timeout) }
  }
  async logout() {
    const token = this.value?.refreshToken
    this.clear()
    if (token) await this.revoke(token)
  }
  private async revoke(token: string) {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)
      try { await authApi.revokeToken(token, controller.signal) } catch { /* Logout local permanece mesmo offline. */ }
      finally { window.clearTimeout(timeout) }
  }
  private persist() {
    try { sessionStorage.setItem(key, JSON.stringify(this.value)) } catch { /* A sessão continua em memória. */ }
    this.schedule()
    this.dispatchEvent(new Event('change'))
  }
  private resume = () => {
    if (document.visibilityState === 'hidden') return
    if (this.value && !this.session) this.clear()
    else if (this.value && Date.parse(this.value.expiresAt) - Date.now() <= 60000) void this.refresh()
  }
  private schedule() {
    window.clearTimeout(this.timer)
    if (this.value) {
      const lead = Math.min(60000, Math.max(1000, this.value.expiresIn * 500))
      this.timer = window.setTimeout(() => { void this.refresh() }, Math.max(0, Date.parse(this.value.expiresAt) - Date.now() - lead))
    }
  }
}
export const authStore = new AuthStore()
