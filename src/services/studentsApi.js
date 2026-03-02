import { getMockStudents } from '../mock/studentsMock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildStudentsUrl(schoolId) {
  if (!API_BASE_URL) return null;
  const base = API_BASE_URL.endsWith('/api')
    ? `${API_BASE_URL}/students`
    : `${API_BASE_URL}/api/students`;
  if (!schoolId) return base;
  return `${base}?schoolId=${encodeURIComponent(schoolId)}`;
}

export async function fetchStudents(schoolId) {
  if (!API_BASE_URL) {
    return getMockStudents();
  }

  const url = buildStudentsUrl(schoolId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Gagal mengambil data siswa dari API lokal.');
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.students)) return payload.students;

  return [];
}
