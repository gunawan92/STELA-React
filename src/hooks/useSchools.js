import { useQuery } from '@tanstack/react-query'
import { fetchSchools } from '../services/schoolApi'

export function useSchools() {
  return useQuery({
    queryKey: ['schools'],
    queryFn: fetchSchools,
    staleTime: 60_000,
  })
}
