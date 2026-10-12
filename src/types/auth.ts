export interface UserInfo { id: string; name: string; email: string }
export interface AuthTokenResponse {
  accessToken: string
  refreshToken: string
  refreshExpiresAt: string
  tokenType: string
  expiresIn: number
  expiresAt: string
  user: UserInfo
}
export interface RegisterRequest { name: string; email: string; password: string }
export interface LoginRequest { email: string; password: string }
export interface ProblemDetails { title?: string; detail?: string; errors?: Record<string, string[]> }
