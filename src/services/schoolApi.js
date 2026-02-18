const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildSchoolListUrl() {
  if (!API_BASE_URL) return null
  if (API_BASE_URL.endsWith('/api')) return `${API_BASE_URL}/schools`
  return `${API_BASE_URL}/api/schools`
}

export function buildSchoolLogoUrl(schoolId) {
  if (!API_BASE_URL || !schoolId) return ''
  if (API_BASE_URL.endsWith('/api')) return `${API_BASE_URL}/schools/${encodeURIComponent(schoolId)}/logo`
  return `${API_BASE_URL}/api/schools/${encodeURIComponent(schoolId)}/logo`
}

export async function fetchSchools() {
  const url = buildSchoolListUrl()
  if (!url) return []

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Gagal mengambil daftar sekolah dari API lokal.')
  }

  const payload = await response.json()
  const rows = payload?.data ?? []
  return rows.map((item) => ({
    id: item.idschool,
    name: item.nama,
    pathFile: item.path_file || null,
    hasLogo: Boolean(item.has_logo),
  }))
}
