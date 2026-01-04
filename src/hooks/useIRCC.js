import { useQuery } from '@tanstack/react-query'
import { searchQuestions, getQuestionDetail } from '../lib/ircc'

export function useIRCCSearch(query, options = {}) {
  return useQuery({
    queryKey: ['ircc-search', query],
    queryFn: () => searchQuestions(query),
    enabled: !!query?.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

export function useIRCCDetail(qnum, lang, options = {}) {
  return useQuery({
    queryKey: ['ircc-detail', qnum, lang],
    queryFn: () => getQuestionDetail(qnum, lang),
    enabled: !!qnum,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  })
}
