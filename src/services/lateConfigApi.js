const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildLateConfigUrl(schoolId) {
  if (!API_BASE_URL) return null
  const base = API_BASE_URL.endsWith('/api')
    ? `${API_BASE_URL}/device/late-config`
    : `${API_BASE_URL}/api/device/late-config`

  if (!schoolId) return base
  return `${base}?schoolId=${encodeURIComponent(schoolId)}`
}

export async function fetchLateConfig(schoolId) {
  const url = buildLateConfigUrl(schoolId)
  if (!url) {
    throw new Error('VITE_API_BASE_URL belum diset untuk late config.')
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Gagal mengambil pengaturan batas telat.')
  }

  const payload = await response.json()
  return payload?.data || { school_id: schoolId || null, late_cutoff_time: '07:00:00' }
}

export async function updateLateConfig({ schoolId, lateCutoffTime }) {
  const url = buildLateConfigUrl()
  if (!url) {
    throw new Error('VITE_API_BASE_URL belum diset untuk late config.')
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      school_id: schoolId,
      late_cutoff_time: lateCutoffTime,
    }),
  })

  if (!response.ok) {
    let message = 'Gagal menyimpan pengaturan batas telat.'
    try {
      const errorPayload = await response.json()
      message = errorPayload?.error?.message || errorPayload?.message || message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  const payload = await response.json()
  return payload?.data || { school_id: schoolId, late_cutoff_time: lateCutoffTime }
}
