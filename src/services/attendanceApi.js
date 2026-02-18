import { getMockAttendanceStats } from '../mock/attendanceStatsMock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildAttendanceStatsUrl() {
  if (!API_BASE_URL) return null;
  if (API_BASE_URL.endsWith('/api')) return `${API_BASE_URL}/attendance/statistics`;
  return `${API_BASE_URL}/api/attendance/statistics`;
}

export async function fetchAttendanceStats() {
  const url = buildAttendanceStatsUrl();
  if (!url) {
    return getMockAttendanceStats();
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Gagal mengambil statistik absensi dari API lokal.');
  }

  const payload = await response.json();
  return {
    lateCount: payload.lateCount ?? payload.statistics?.lateCount ?? 0,
    arrivedCount: payload.arrivedCount ?? payload.statistics?.arrivedCount ?? 0,
    notTapCount: payload.notTapCount ?? payload.statistics?.notTapCount ?? 0,
    updatedAt: payload.updatedAt ?? payload.statistics?.updatedAt ?? new Date().toISOString(),
  };
}
