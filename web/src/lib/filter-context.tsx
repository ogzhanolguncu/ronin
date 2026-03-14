import { createContext, useContext } from 'react'

export type FilterState = {
  activeTag: string | null
  onTagClick: (tag: string | null) => void
}

export const FilterContext = createContext<FilterState>({
  activeTag: null,
  onTagClick: () => {},
})

export const useFilterContext = () => useContext(FilterContext)
