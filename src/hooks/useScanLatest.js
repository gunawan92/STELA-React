import { useQuery } from '@tanstack/react-query'

export function useScanLatest() {
  return useQuery({
    queryKey: ['scan-latest'],
    queryFn: async () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
