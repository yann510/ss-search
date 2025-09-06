import { expectTypeOf, test } from 'vitest'
import { indexDocuments, search, type SearchResultWithScore, tokenize } from './ss-search'

type Item = { number: number; text: string }

const data: Item[] = [
  { number: 1, text: 'one' },
  { number: 2, text: 'two' },
]
const keys: Array<keyof Item> = ['number', 'text']

test('search without options returns T[]', () => {
  const result = search(data, keys as string[], 'one')
  expectTypeOf(result).toEqualTypeOf<Item[]>()
})

test('search with withScore: true returns SearchResultWithScore<T>[]', () => {
  const result = search(data, keys as string[], 'one', { withScore: true })
  expectTypeOf(result).toEqualTypeOf<Array<SearchResultWithScore<Item>>>()
})

test('search with withScore: false returns T[]', () => {
  const result = search(data, keys as string[], 'one', { withScore: false })
  expectTypeOf(result).toEqualTypeOf<Item[]>()
})

test('search with dynamic boolean returns union of T | SearchResultWithScore<T>', () => {
  const withScore: boolean = Math.random() > 0.5
  const result = search(data, keys as string[], 'one', { withScore })
  expectTypeOf(result).toEqualTypeOf<Array<Item | SearchResultWithScore<Item>>>()
})

test('indexDocuments returns string[]', () => {
  const strings = indexDocuments(data, keys as string[], null)
  expectTypeOf(strings).toEqualTypeOf<string[]>()
})

test('tokenize returns string[]', () => {
  const tokens = tokenize('Hello, 世界 123')
  expectTypeOf(tokens).toEqualTypeOf<string[]>()
})
