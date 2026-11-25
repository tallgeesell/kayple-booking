export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    this.status = status
    this.code = body?.code
    this.field = body?.field
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, { message: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
