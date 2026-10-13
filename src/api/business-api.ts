import { authenticatedRequest } from './http'
export const businessRequest = <T>(method: string, path: string, body?: unknown, blob = false) => authenticatedRequest<T>(method, path, body, undefined, blob)
