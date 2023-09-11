// import { deburr, escapeRegExp, get, memoize, round } from 'lodash'
import deburr from 'lodash/deburr'
import escapeRegExp from 'lodash/escapeRegExp'
import memoize from 'lodash/memoize'
import get from 'lodash/get'
import round from 'lodash/round'

export const normalize = (text: string | undefined) =>
  deburr(text)
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()

export const tokenize = (searchText: string | undefined): string[] => normalize(escapeRegExp(searchText)).match(/[\p{L}\d]+/gimu) || []

export const convertToSearchableStrings = memoize(<T>(elements: T[] | null, searchableKeys: string[] | null) => {
  if (!elements || elements.length === 0 || !searchableKeys || searchableKeys.length === 0) {
    return []
  }

  const arraySelectorRegex = /\[(.*)]/
  return elements
    .map((element) =>
      searchableKeys
        .map((key) => {
          const arraySelector = get(arraySelectorRegex.exec(key), '1')

          const value = get(element, key.replace(arraySelectorRegex, ''))
          if (value === null || value === undefined || typeof value === 'function') {
            return ''
          }

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
})

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

// Overload 1: No options provided or withScore is not true
export function search<T>(elements: T[], searchableKeys: string[], searchText: string): T[]

// Overload 2: withScore is true
export function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options: { withScore: true },
): { element: T; score: number }[]

// Implementation signature
export function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options?: { withScore?: boolean },
): T[] | { element: T; score: number }[] {
  if (!searchText) {
    return elements
  }

  const searchWords = tokenize(searchText)
  const searchableDataStrings = convertToSearchableStrings(elements, searchableKeys)

  if (options?.withScore) {
    return searchableDataStrings
      .map((x, i) => {
        const matchesAllSearchWords = searchWords.filter((searchWord) => x.indexOf(searchWord) > -1).length === searchWords.length
        const score = getScore(matchesAllSearchWords, searchWords, x)
        return { element: elements[i], score }
      })
      .filter((x) => x)
  }

  return searchableDataStrings
    .map((x, i) => {
      const matchesAllSearchWords = searchWords.filter((searchWord) => x.indexOf(searchWord) > -1).length === searchWords.length
      return matchesAllSearchWords ? elements[i] : null
    })
    .filter((x): x is T => x !== null)
}
