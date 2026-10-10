import { describe, expect, test, afterEach, expectTypeOf } from 'vitest'
import {
  deburr as lodashDeburr,
  escapeRegExp as lodashEscape,
  get as lodashGet,
  memoize as lodashMemoize,
  round as lodashRound,
} from 'lodash-es'
import * as current from './ss-search'
import { deburr, escapeRegExp, get, round } from './internal'

const getReference = lodashGet
const memoize = lodashMemoize

const normalizeReference = (text: string | undefined) =>
  lodashDeburr(text)
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()

const tokenizeReference = (searchText: string | undefined): string[] =>
  normalizeReference(lodashEscape(searchText)).match(/[\p{L}\d]+/gimu) || []

const convertToSearchableStrings = memoize(
  <T>(elements: T[] | null, searchableKeys: string[] | null, _cacheKey: unknown | null) => {
    if (!elements || elements.length === 0 || !searchableKeys || searchableKeys.length === 0) {
      return []
    }

    const arraySelectorRegex = /\[(.*)]/
    return elements
      .map((element) =>
        searchableKeys
          .map((key) => {
            const value = getReference(element, key.replace(arraySelectorRegex, ''))
            if (value === null || value === undefined || typeof value === 'function') {
              return ''
            }

            const arraySelector = getReference(arraySelectorRegex.exec(key), '1')
            if (arraySelector) {
              return value.map((x: unknown) => getReference(x, arraySelector))
            }

            if (Array.isArray(value) || typeof value === 'object') {
              return JSON.stringify(value)
            }

            return value
          })
          .reduce((a, b) => a + b, ''),
      )
      .map((x) => normalizeReference(x))
  },
  (elements, _, cacheKey) => cacheKey ?? elements,
)

const indexDocuments = convertToSearchableStrings

const getScore = (matchesAllSearchWords: boolean, searchWords: string[], searchableDataString: string) => {
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
  return lodashRound(1 - remainingTextAfterRemovingSearchWords.length / searchableDataStringWithoutNonWordCharacters.length, 4)
}

type SearchResultWithScore<T> = { element: T; score: number }

function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options: { withScore: true; cacheKey?: unknown },
): SearchResultWithScore<T>[]
function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options?: { withScore?: false | undefined; cacheKey?: unknown },
): T[]
function search<T>(
  elements: T[],
  searchableKeys: string[],
  searchText: string,
  options?: { withScore?: boolean; cacheKey?: unknown },
): Array<SearchResultWithScore<T> | T> {
  const searchWords = tokenizeReference(searchText)
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

afterEach(() => {
  current.indexDocuments.cache.clear?.()
  convertToSearchableStrings.cache.clear?.()
})

describe('Lodash behavior compatibility', () => {
  test('all Unicode code points retain the original normalization and tokenization', () => {
    // Chunks exercise every scalar and lone surrogate without a million assertions.
    for (let start = 0; start <= 0x10ffff; start += 1024) {
      const text = Array.from({ length: Math.min(1024, 0x110000 - start) }, (_, offset) => String.fromCodePoint(start + offset)).join(' ')
      expect(deburr(text)).toBe(lodashDeburr(text))
      expect(current.normalize(text)).toBe(normalizeReference(text))
      expect(current.tokenize(text)).toEqual(tokenizeReference(text))
    }
  })

  test('coercion includes null, symbols, nested and sparse arrays, and negative zero', () => {
    const iterableArray = ['Æ', 'É']
    Object.defineProperty(iterableArray, Symbol.iterator, {
      value: function* () {
        yield 'wrong'
      },
    })
    const values = [
      iterableArray,
      { [Symbol.toStringTag]: 'Symbol', toString: () => 'Æ' },
      undefined,
      null,
      -0,
      0,
      NaN,
      Infinity,
      true,
      17n,
      Symbol('É'),
      Object(Symbol('É')),
      [null, undefined, -0, ['Æ']],
      new Array(3),
      { toString: () => 'É' },
    ]
    for (const value of values) {
      expect(deburr(value)).toBe(lodashDeburr(value as string))
      expect(escapeRegExp(value)).toBe(lodashEscape(value as string))
      expect(current.normalize(value as string)).toBe(normalizeReference(value as string))
      expect(current.tokenize(value as string)).toEqual(tokenizeReference(value as string))
    }
    const text = '.*+?^$()[]{}|\\'
    expect(escapeRegExp(text)).toBe(lodashEscape(text))
  })

  test('property grammar, inherited/direct keys, empty segments and capped path cache', () => {
    const object = Object.assign(Object.create({ 'inherited.path': 'direct inherited', inherited: { path: 'nested' } }), {
      'a.b': 'direct',
      a: { b: 'nested', '': { c: 'empty' }, '-0': 'minus', '1.5': 'fraction', 'q"uote': 'quote', 'b\\c': 'slash' },
      '': { '': 'empty empty', x: 'leading' },
      list: [{ name: 'one' }],
      'unicode.é': 'Unicode direct',
    })
    const paths = [
      'a.b',
      'a..c',
      '.x',
      '..',
      'a[-0]',
      'a[1.5]',
      'a["q\\"uote"]',
      "a['b\\\\c']",
      'list[0].name',
      'list.0.name',
      'list[]',
      'missing',
      'inherited.path',
      'unicode.é',
      'constructor.name',
      '__proto__',
      '',
      '.',
      'a[',
      'a]',
      'a[]',
    ]
    for (const path of paths) expect(get(object, path)).toEqual(lodashGet(object, path))
    for (let i = 0; i < 1100; i++) {
      const object = { nested: { [i]: i } }
      expect(get(object, `nested.${i}`)).toBe(lodashGet(object, `nested.${i}`))
    }
    for (const value of [null, undefined, 'text', 42, false])
      expect(get(value, 'constructor.name')).toEqual(lodashGet(value, 'constructor.name'))
  })

  test('indexing keeps custom array selectors, coercion, serialization and failures', () => {
    const data = [
      {
        title: 'Æ Œ Ł',
        'title.text': 'direct',
        titleNested: { text: 'deep' },
        arrays: [{ label: 'Ö' }, { label: null }, {}],
        nested: { empty: null },
        list: [1, 2],
        fn: () => 1,
        zero: -0,
      },
    ]
    const keys = ['title', 'title.text', 'titleNested.text', 'arrays[label]', 'nested.empty', 'list', 'fn', 'zero', 'missing']
    expect(current.indexDocuments(data, keys, null)).toEqual(convertToSearchableStrings(data, keys, null))
    for (const invalid of [{ arrays: 'wrong' }, { arrays: {} }, { arrays: { map: 1 } }]) {
      expect(() => current.indexDocuments([invalid], ['arrays[label]'], null)).toThrow()
      expect(() => convertToSearchableStrings([invalid], ['arrays[label]'], null)).toThrow()
    }
    const cyclic: { value?: unknown } = {}
    cyclic.value = cyclic
    expect(() => current.indexDocuments([cyclic], ['value'], null)).toThrow()
    expect(() => convertToSearchableStrings([cyclic], ['value'], null)).toThrow()
  })

  test('cache identity, key equality, mutation, replacement and alias remain compatible', () => {
    expect(current.indexDocuments).toBe(current.convertToSearchableStrings)
    const saved = current.indexDocuments.cache
    const reference = convertToSearchableStrings.cache
    const symbol = Symbol(),
      object = {},
      fn = () => 1
    const keys = [null, undefined, NaN, 0, -0, false, true, '', '0', 'NaN', '__proto__', 'constructor', symbol, object, fn]
    for (const key of keys) {
      saved.set(key, [String(key)])
      reference.set(key, [String(key)])
      expect(saved.has(key)).toBe(reference.has(key))
      expect(saved.get(key)).toEqual(reference.get(key))
      expect(saved.delete(key)).toBe(reference.delete(key))
    }
    const data = [{ name: 'first' }]
    const first = current.indexDocuments(data, ['name'], null)
    data[0]!.name = 'second'
    expect(current.indexDocuments(data, ['name'], null)).toBe(first)
    saved.delete(data)
    expect(current.indexDocuments(data, ['name'], null)).toEqual(['second'])
    saved.set('injected', ['injected'])
    expect(current.indexDocuments(data, ['name'], 'injected')).toEqual(['injected'])
    for (const key of ['literal', '__proto__', undefined, object, 2, symbol]) {
      saved.set(key, '__lodash_hash_undefined__')
      reference.set(key, '__lodash_hash_undefined__')
      expect(saved.get(key)).toBe(reference.get(key))
    }
    try {
      const replacement = new Map()
      current.indexDocuments.cache = {
        has: () => false,
        get: () => undefined,
        delete: () => false,
        set: (key, value) => replacement.set(key, value) as typeof current.indexDocuments.cache,
      }
      expect(current.indexDocuments(data, ['name'], 'replacement')).toEqual(['second'])
      expect(current.indexDocuments.cache).toBe(replacement)
      expect(current.indexDocuments(data, ['name'], 'replacement')).toBe(replacement.get('replacement'))
      current.indexDocuments.cache = new WeakMap()
      expect(current.indexDocuments(data, ['name'], null)).toEqual(['second'])
    } finally {
      current.indexDocuments.cache = saved
    }
    expectTypeOf(current.indexDocuments.cache).toMatchTypeOf<typeof reference>()
    expectTypeOf(reference).toMatchTypeOf<typeof current.indexDocuments.cache>()
  })

  test('decimal rounding, empty score, overlap, mutation and scored/unscored search', () => {
    for (const value of [NaN, Infinity, -Infinity, -0, 0, 1.005, -1.005, 0.00005, -0.00005, 1e-300, -1e-300, 1e300]) {
      expect(Object.is(round(value, 4), lodashRound(value, 4))).toBe(true)
    }
    for (let i = -100000; i <= 100000; i += 17) expect(round(i / 300003, 4)).toBe(lodashRound(i / 300003, 4))
    const data = [{ name: 'É banana bandana' }, { name: 'banana' }, { name: '' }, { name: '世界 123' }]
    for (const query of ['', ' ', 'ana ban', 'banana', 'É', '世界', '123', '.*', 'absent']) {
      expect(current.search(data, ['name'], query)).toEqual(search(data, ['name'], query))
      expect(current.search(data, ['name'], query, { withScore: true })).toEqual(search(data, ['name'], query, { withScore: true }))
    }
    const words = ['a', 'banana', 'ana'],
      referenceWords = [...words]
    expect(current.getScore(true, words, 'banana')).toBe(getScore(true, referenceWords, 'banana'))
    expect(words).toEqual(referenceWords)
    expect(current.getScore(true, [], '')).toBeNaN()
    expect(current.getScore(false, ['a'], '')).toBe(0)
  })
})
