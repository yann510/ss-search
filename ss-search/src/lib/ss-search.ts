import { get, deburr, escapeRegExp, memoize, round } from 'lodash-es'

export const normalize = (text: string | undefined) =>
  deburr(text)
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()

export const tokenize = (searchText: string | undefined): string[] => normalize(escapeRegExp(searchText)).match(/[\p{L}\d]+/gimu) || []

export const convertToSearchableStrings = memoize(
  <T>(elements: T[] | null, searchableKeys: string[] | null, _cacheKey: unknown | null) => {
    if (!elements || elements.length === 0 || !searchableKeys || searchableKeys.length === 0) {
      return []
    }

    const arraySelectorRegex = /\[(.*)]/
    return elements
      .map((element) =>
        searchableKeys
          .map((key) => {
            const value = get(element, key.replace(arraySelectorRegex, ''))
            if (value === null || value === undefined || typeof value === 'function') {
              return ''
            }

            const arraySelector = get(arraySelectorRegex.exec(key), '1')
            if (arraySelector) {
              return value.map((x: unknown) => get(x, arraySelector))
            }

            if (Array.isArray(value) || typeof value === 'object') {
              return JSON.stringify(value)
            }

            return value
          })
          .reduce((a, b) => a + b, ''),
      )
      .map((x) => normalize(x))
  },
  (elements, _, cacheKey) => cacheKey ?? elements,
)

export const indexDocuments = convertToSearchableStrings

export const getScore = (matchesAllSearchWords: boolean, searchWords: string[], searchableDataString: string) => {
  if (!matchesAllSearchWords) {
    return 0
  }

  const searchableDataStringWithoutNonWordCharacters = searchableDataString.replace(/[^\p{L}\d]+/gimu, '')
  const remainingTextAfterRemovingSearchWords = searchWords
    .sort((a, b) => b.length - a.length)
    .reduce(
      (remainingText, searchWord) => remainingText.replace(new RegExp(searchWord, 'gm'), ''),
      searchableDataStringWithoutNonWordCharacters,
    )
  return round(1 - remainingTextAfterRemovingSearchWords.length / searchableDataStringWithoutNonWordCharacters.length, 4)
}

export type SearchResultWithScore<T> = { element: T; score: number }

export function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options: { withScore: true; cacheKey?: unknown },
): SearchResultWithScore<T>[]
export function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options?: { withScore?: false | undefined; cacheKey?: unknown },
): T[]
export function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options?: { withScore?: boolean; cacheKey?: unknown },
): Array<SearchResultWithScore<T> | T> {
  const searchWords = tokenize(searchText)
  const searchableDataStrings = convertToSearchableStrings(elements, searchableKeys, options?.cacheKey)

  const results: Array<SearchResultWithScore<T> | T> = []

  for (let i = 0; i < searchableDataStrings.length; i++) {
    const x = searchableDataStrings[i]!
    const matchesAllSearchWords = searchWords.every((searchWord) => x.includes(searchWord))

    if (options?.withScore) {
      const score = getScore(matchesAllSearchWords, searchWords, x)
      results.push({ element: elements[i]!, score })
      continue
    }

    if (matchesAllSearchWords) {
      results.push(elements[i]!)
    }
  }

  return results
}
