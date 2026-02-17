import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../services/studentsApi';

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
  });
}
