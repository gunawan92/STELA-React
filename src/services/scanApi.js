const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildScanCheckinUrl() {
  if (!API_BASE_URL) return null
  if (API_BASE_URL.endsWith('/api')) return `${API_BASE_URL}/scan/checkin`
  return `${API_BASE_URL}/api/scan/checkin`
}

export async function postScanCheckin(payload) {
  const url = buildScanCheckinUrl()
  if (!url) {
    throw new Error('VITE_API_BASE_URL belum diset untuk scan checkin.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = 'Gagal mengirim scan checkin.'
    try {
      const errorPayload = await response.json()
      message =
        errorPayload?.error?.message ||
        errorPayload?.message ||
        message
    } catch {
      const fallbackText = await response.text().catch(() => '')
      if (fallbackText) {
        message = fallbackText
      } else {
        message = `HTTP ${response.status}: ${message}`
      }
    }
    throw new Error(message)
  }

  const result = await response.json()
  return result?.data ?? result
}
