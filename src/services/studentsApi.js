import { getMockStudents } from '../mock/studentsMock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchStudents() {
  if (!API_BASE_URL) {
    return getMockStudents();
  }

  const response = await fetch(`${API_BASE_URL}/students`);

  if (!response.ok) {
    throw new Error('Gagal mengambil data siswa dari API lokal.');
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.students)) return payload.students;

  return [];
}
