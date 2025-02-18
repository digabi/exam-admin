export async function getJson<T>(url: string, body?: object): Promise<{ json: T | null; status: number }> {
  return await fetchJson<T>(url, { method: 'GET', body: body ? JSON.stringify(body) : undefined })
}

export async function postJson<T>(url: string, body?: object): Promise<{ json: T | null; status: number }> {
  return await fetchJson<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
}

export async function deleteJson<T>(url: string, body?: object): Promise<{ json: T | null; status: number }> {
  return await fetchJson<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
}

async function fetchJson<T>(
  url: string,
  options: {
    method: 'GET' | 'POST' | 'DELETE'
    body?: string
  } = { method: 'GET' }
): Promise<{ json: T | null; status: number }> {
  try {
    const response = await fetch(url, { ...options, headers: { 'Content-type': 'application/json' } })
    try {
      return { json: (await response.json()) as T, status: response.status }
    } catch (err) {
      return { json: null, status: response.status }
    }
  } catch (err) {
    return { json: null, status: 400 }
  }
}
