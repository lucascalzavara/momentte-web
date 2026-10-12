import type { ProblemDetails } from '../types/auth'
import { authStore } from '../auth/auth-store'

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, string[]> = {}) { super(message) }
}

export async function post<T>(path: string, body: unknown, signal?: AbortSignal, accessToken?: string): Promise<T> {
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body), signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(0, 'Não foi possível conectar à Momentte. Verifique sua conexão e tente novamente.')
  }
  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const problem = (data && typeof data === 'object' ? data : {}) as ProblemDetails
    const fallback: Record<number, string> = {
      400: 'Confira os dados informados.', 401: 'E-mail ou senha inválidos.',
      409: 'Já existe uma conta com este e-mail. Entre na sua conta.',
      429: 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.',
    }
    throw new ApiError(response.status, response.status >= 500 ? 'Não foi possível concluir agora. Tente novamente em instantes.' :
      problem.detail || fallback[response.status] || 'Não foi possível concluir a solicitação.', problem.errors)
  }
  if (!data || typeof data !== 'object') throw new ApiError(0, 'A Momentte retornou uma resposta inesperada. Tente novamente.')
  return data as T
}

export async function authenticatedPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const session = authStore.session
  if (!session) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.')
  if (Date.parse(session.expiresAt) <= Date.now() && !await authStore.refresh())
    throw new ApiError(401, 'Não foi possível renovar a sessão. Tente novamente.')
  const originalToken = authStore.session?.accessToken
  try { return await post<T>(path, body, signal, originalToken) }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    if (authStore.session?.accessToken === originalToken && !await authStore.refresh()) throw error
    if (!authStore.session) throw error
    try { return await post<T>(path, body, signal, authStore.session.accessToken) }
    catch (retryError) { if (retryError instanceof ApiError && retryError.status === 401) authStore.clear(); throw retryError }
  }
}
