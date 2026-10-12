import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercita os módulos reais sem rede, banco ou credenciais.
function load(file, globals = {}, dependencies = {}) {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env.DEV', 'true').replaceAll('import.meta.env.VITE_API_BASE_URL', "''")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: name => dependencies[name], EventTarget, Event, AbortController, Date, JSON, Error, ...globals })
  return exports
}
let response = { ok: true, json: async () => ({ accessToken: 'token' }) }
let call
const http = load('api/http.ts', { fetch: async (url, options) => { call = { url, options }; return response } }, { '../auth/auth-store': {} })
const api = load('api/auth-api.ts', {}, { './http': http }).authApi
await api.register({ name: 'Ana', email: 'ana@example.com', password: 'Senha123!' })
assert.equal(call.url, '/api/v1/auth/register')
assert.equal(call.options.method, 'POST')
assert.deepEqual(JSON.parse(call.options.body), { name: 'Ana', email: 'ana@example.com', password: 'Senha123!' })
await api.login({ email: 'ana@example.com', password: 'Senha123!' })
assert.equal(call.url, '/api/v1/auth/login')
for (const status of [400, 401, 409, 429, 500]) {
  response = { ok: false, status, json: async () => ({ errors: { Email: ['invalid'] } }) }
  await assert.rejects(api.login({ email: 'a', password: 'b' }), error => error instanceof http.ApiError && error.status === status && Boolean(error.message))
}
response = { ok: true, json: async () => null }
await assert.rejects(api.login({ email: 'a', password: 'b' }), http.ApiError)
const offline = load('api/http.ts', { fetch: async () => { throw new Error('offline') } }, { '../auth/auth-store': {} })
await assert.rejects(offline.post('/api/v1/auth/login', {}), error => error.status === 0 && error.message.includes('conectar'))

const storage = new Map()
let expire
let delay
let refreshCalls = 0
let revoked = []
let refreshImpl
const fakeApi = {
  refreshToken: (...args) => { refreshCalls++; return refreshImpl(...args) },
  revokeToken: async token => { revoked.push(token) },
}
const dependencies = { '../api/auth-api': { authApi: fakeApi }, '../api/http': http }
const globals = {
  sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  window: { clearTimeout() {}, setTimeout(callback, ms) { expire = callback; delay = ms; return 1 }, addEventListener() {} },
  document: { visibilityState: 'visible', addEventListener() {} },
}
const store = load('auth/auth-store.ts', globals, dependencies).authStore
const token = { accessToken: 'jwt', refreshToken: 'refresh-1', refreshExpiresAt: new Date(Date.now() + 15 * 86400000).toISOString(), tokenType: 'Bearer', expiresIn: 3600, expiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: 'id', name: 'Ana', email: 'ana@example.com' } }
const rotated = { ...token, accessToken: 'jwt-2', refreshToken: 'refresh-2' }
refreshImpl = async () => rotated
store.apply(token)
const refreshTimer = expire
assert.ok(delay > 3539000 && delay <= 3540000, 'Renovação um minuto antes de expirar')
assert.equal(store.session.user.name, 'Ana')
assert.equal(storage.size, 1)
assert.equal(load('auth/auth-store.ts', globals, dependencies).authStore.session.user.email, 'ana@example.com')
assert.throws(() => store.apply({ ...token, expiresAt: 'invalid' }))
assert.throws(() => store.apply({ ...token, expiresAt: new Date(0).toISOString() }))
refreshTimer()
await store.refresh()
assert.equal(store.session.refreshToken, 'refresh-2')
assert.equal(refreshCalls, 1)
assert.equal(JSON.parse(storage.get('momentte.auth.session')).refreshToken, 'refresh-2')
store.apply(token)
let resolveRefresh
refreshImpl = () => new Promise(resolve => { resolveRefresh = resolve })
const first = store.refresh()
const second = store.refresh()
assert.equal(first, second, 'Chamadas simultâneas compartilham uma renovação')
resolveRefresh(rotated)
assert.equal(await first, true)

refreshImpl = async () => { throw new http.ApiError(0, 'offline') }
assert.equal(await store.refresh(), false)
assert.equal(store.session.refreshToken, 'refresh-2', 'Falha transitória preserva sessão')
assert.equal(delay, 60000)
refreshImpl = async () => { throw new http.ApiError(401, 'revogado') }
assert.equal(await store.refresh(), false)
assert.equal(store.session, null)
assert.equal(storage.size, 0)
store.apply(token)
await store.logout()
assert.equal(store.session, null)
assert.ok(revoked.includes('refresh-1'))

store.apply(token)
refreshImpl = () => new Promise(resolve => { resolveRefresh = resolve })
const pending = store.refresh()
await store.logout()
resolveRefresh(rotated)
assert.equal(await pending, false)
assert.equal(store.session, null, 'Refresh tardio não restaura sessão após logout')
assert.ok(revoked.includes('refresh-2'))

storage.set('momentte.auth.session', JSON.stringify({ ...token, expiresAt: new Date(0).toISOString() }))
assert.equal(load('auth/auth-store.ts', globals, dependencies).authStore.session.refreshToken, 'refresh-1', 'Restaura refresh válido mesmo com access token expirado')
assert.equal(delay, 0)
storage.set('momentte.auth.session', '{broken')
assert.equal(load('auth/auth-store.ts', globals, dependencies).authStore.session, null)

response = { ok: true, json: async () => rotated }
await api.refreshToken('refresh-1')
assert.equal(call.url, '/api/v1/auth/refresh-token')
assert.equal(JSON.parse(call.options.body).refreshToken, 'refresh-1')
response = { ok: true, status: 204 }
assert.equal(await api.revokeToken('refresh-1'), undefined)

let requestCount = 0
let retryRefreshCount = 0
const fakeStore = { session: token, async refresh() { retryRefreshCount++; this.session = rotated; return true }, clear() { this.session = null } }
const protectedHttp = load('api/http.ts', { fetch: async (_url, options) => {
  requestCount++
  assert.equal(options.headers.Authorization, requestCount === 1 ? 'Bearer jwt' : 'Bearer jwt-2')
  return requestCount === 1 ? { ok: false, status: 401, json: async () => ({}) } : { ok: true, json: async () => ({ done: true }) }
} }, { '../auth/auth-store': { authStore: fakeStore } })
assert.equal((await protectedHttp.authenticatedPost('/api/example', {})).done, true)
assert.equal(requestCount, 2)
assert.equal(retryRefreshCount, 1)
fakeStore.session = token
let rejectedCount = 0
const rejectedHttp = load('api/http.ts', { fetch: async () => {
  rejectedCount++
  return { ok: false, status: 401, json: async () => ({}) }
} }, { '../auth/auth-store': { authStore: fakeStore } })
await assert.rejects(rejectedHttp.authenticatedPost('/api/example', {}), error => error.status === 401)
assert.equal(rejectedCount, 2, 'Nunca entra em loop de retry')
assert.equal(fakeStore.session, null)
store.apply({ ...token, expiresIn: 60, expiresAt: new Date(Date.now() + 60000).toISOString() })
assert.ok(delay > 29000 && delay <= 30000, 'JWT curto não provoca loop imediato de refresh')
store.clear()
console.log('OK: endpoints, payloads, erros HTTP, refresh automático, concorrência, falhas transitórias, restauração, logout e retry no 401.')
