import { post } from './http'
import type { AuthTokenResponse, LoginRequest, RegisterRequest } from '../types/auth'
export const authApi = {
  login: (request: LoginRequest, signal?: AbortSignal) => post<AuthTokenResponse>('/api/v1/auth/login', request, signal),
  register: (request: RegisterRequest, signal?: AbortSignal) => post<AuthTokenResponse>('/api/v1/auth/register', request, signal),
  refreshToken: (refreshToken: string, signal?: AbortSignal) => post<AuthTokenResponse>('/api/v1/auth/refresh-token', { refreshToken }, signal),
  revokeToken: (refreshToken: string, signal?: AbortSignal) => post<void>('/api/v1/auth/revoke-token', { refreshToken }, signal),
}
