import { useQuery } from '@tanstack/react-query';
import { fetchAttendanceStats } from '../services/attendanceApi';

export function useAttendanceStats() {
  return useQuery({
    queryKey: ['attendance-stats'],
    queryFn: fetchAttendanceStats,
  });
}
