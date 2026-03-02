import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../services/studentsApi';

export function useStudents(schoolId) {
  return useQuery({
    queryKey: ['students', schoolId || ''],
    queryFn: () => fetchStudents(schoolId),
  });
}
