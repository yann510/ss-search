/**
 * String conversion, Latin mappings, path parsing and decimal shifting adapted
 * from Lodash, Copyright OpenJS Foundation and other contributors, MIT licensed.
 * See THIRD_PARTY_LICENSES for the complete license.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Preserve Lodash's permissive cache and coercion contracts. */

const deburredLetters: Record<string, string> = {
  // Latin-1 Supplement block.
  '\xc0': 'A',
  '\xc1': 'A',
  '\xc2': 'A',
  '\xc3': 'A',
  '\xc4': 'A',
  '\xc5': 'A',
  '\xe0': 'a',
  '\xe1': 'a',
  '\xe2': 'a',
  '\xe3': 'a',
  '\xe4': 'a',
  '\xe5': 'a',
  '\xc7': 'C',
  '\xe7': 'c',
  '\xd0': 'D',
  '\xf0': 'd',
  '\xc8': 'E',
  '\xc9': 'E',
  '\xca': 'E',
  '\xcb': 'E',
  '\xe8': 'e',
  '\xe9': 'e',
  '\xea': 'e',
  '\xeb': 'e',
  '\xcc': 'I',
  '\xcd': 'I',
  '\xce': 'I',
  '\xcf': 'I',
  '\xec': 'i',
  '\xed': 'i',
  '\xee': 'i',
  '\xef': 'i',
  '\xd1': 'N',
  '\xf1': 'n',
  '\xd2': 'O',
  '\xd3': 'O',
  '\xd4': 'O',
  '\xd5': 'O',
  '\xd6': 'O',
  '\xd8': 'O',
  '\xf2': 'o',
  '\xf3': 'o',
  '\xf4': 'o',
  '\xf5': 'o',
  '\xf6': 'o',
  '\xf8': 'o',
  '\xd9': 'U',
  '\xda': 'U',
  '\xdb': 'U',
  '\xdc': 'U',
  '\xf9': 'u',
  '\xfa': 'u',
  '\xfb': 'u',
  '\xfc': 'u',
  '\xdd': 'Y',
  '\xfd': 'y',
  '\xff': 'y',
  '\xc6': 'Ae',
  '\xe6': 'ae',
  '\xde': 'Th',
  '\xfe': 'th',
  '\xdf': 'ss',
  // Latin Extended-A block.
  '\u0100': 'A',
  '\u0102': 'A',
  '\u0104': 'A',
  '\u0101': 'a',
  '\u0103': 'a',
  '\u0105': 'a',
  '\u0106': 'C',
  '\u0108': 'C',
  '\u010a': 'C',
  '\u010c': 'C',
  '\u0107': 'c',
  '\u0109': 'c',
  '\u010b': 'c',
  '\u010d': 'c',
  '\u010e': 'D',
  '\u0110': 'D',
  '\u010f': 'd',
  '\u0111': 'd',
  '\u0112': 'E',
  '\u0114': 'E',
  '\u0116': 'E',
  '\u0118': 'E',
  '\u011a': 'E',
  '\u0113': 'e',
  '\u0115': 'e',
  '\u0117': 'e',
  '\u0119': 'e',
  '\u011b': 'e',
  '\u011c': 'G',
  '\u011e': 'G',
  '\u0120': 'G',
  '\u0122': 'G',
  '\u011d': 'g',
  '\u011f': 'g',
  '\u0121': 'g',
  '\u0123': 'g',
  '\u0124': 'H',
  '\u0126': 'H',
  '\u0125': 'h',
  '\u0127': 'h',
  '\u0128': 'I',
  '\u012a': 'I',
  '\u012c': 'I',
  '\u012e': 'I',
  '\u0130': 'I',
  '\u0129': 'i',
  '\u012b': 'i',
  '\u012d': 'i',
  '\u012f': 'i',
  '\u0131': 'i',
  '\u0134': 'J',
  '\u0135': 'j',
  '\u0136': 'K',
  '\u0137': 'k',
  '\u0138': 'k',
  '\u0139': 'L',
  '\u013b': 'L',
  '\u013d': 'L',
  '\u013f': 'L',
  '\u0141': 'L',
  '\u013a': 'l',
  '\u013c': 'l',
  '\u013e': 'l',
  '\u0140': 'l',
  '\u0142': 'l',
  '\u0143': 'N',
  '\u0145': 'N',
  '\u0147': 'N',
  '\u014a': 'N',
  '\u0144': 'n',
  '\u0146': 'n',
  '\u0148': 'n',
  '\u014b': 'n',
  '\u014c': 'O',
  '\u014e': 'O',
  '\u0150': 'O',
  '\u014d': 'o',
  '\u014f': 'o',
  '\u0151': 'o',
  '\u0154': 'R',
  '\u0156': 'R',
  '\u0158': 'R',
  '\u0155': 'r',
  '\u0157': 'r',
  '\u0159': 'r',
  '\u015a': 'S',
  '\u015c': 'S',
  '\u015e': 'S',
  '\u0160': 'S',
  '\u015b': 's',
  '\u015d': 's',
  '\u015f': 's',
  '\u0161': 's',
  '\u0162': 'T',
  '\u0164': 'T',
  '\u0166': 'T',
  '\u0163': 't',
  '\u0165': 't',
  '\u0167': 't',
  '\u0168': 'U',
  '\u016a': 'U',
  '\u016c': 'U',
  '\u016e': 'U',
  '\u0170': 'U',
  '\u0172': 'U',
  '\u0169': 'u',
  '\u016b': 'u',
  '\u016d': 'u',
  '\u016f': 'u',
  '\u0171': 'u',
  '\u0173': 'u',
  '\u0174': 'W',
  '\u0175': 'w',
  '\u0176': 'Y',
  '\u0177': 'y',
  '\u0178': 'Y',
  '\u0179': 'Z',
  '\u017b': 'Z',
  '\u017d': 'Z',
  '\u017a': 'z',
  '\u017c': 'z',
  '\u017e': 'z',
  '\u0132': 'IJ',
  '\u0133': 'ij',
  '\u0152': 'Oe',
  '\u0153': 'oe',
  '\u0149': "'n",
  '\u017f': 's',
}

function isSymbol(value: any): boolean {
  if (typeof value === 'symbol') return true
  if (value == null || typeof value !== 'object') return false
  if (!(Symbol.toStringTag in value)) return Object.prototype.toString.call(value) === '[object Symbol]'
  const own = Object.prototype.hasOwnProperty.call(value, Symbol.toStringTag)
  const tag = value[Symbol.toStringTag]
  let unmasked = false
  try {
    value[Symbol.toStringTag] = undefined
    unmasked = true
  } catch {
    /* Read-only built-in tags cannot be masked. */
  }
  const result = Object.prototype.toString.call(value)
  if (unmasked) {
    if (own) value[Symbol.toStringTag] = tag
    else delete value[Symbol.toStringTag]
  }
  return result === '[object Symbol]'
}

function baseToString(value: any): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const result = new Array(value.length)
    for (let i = 0; i < result.length; i++) result[i] = baseToString(value[i])
    return result + ''
  }
  if (isSymbol(value)) {
    return Symbol.prototype.toString.call(value)
  }
  const result = value + ''
  return result === '0' && 1 / value === -Infinity ? '-0' : result
}

export const toString = (value: unknown): string => (value == null ? '' : baseToString(value))

const reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g
const reCombiningMark = /[\u0300-\u036f\ufe20-\ufe2f\u20d0-\u20ff]/g
const deburrLetter = (letter: string): string => deburredLetters[letter]!
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g
const reHasRegExpChar = /[\\^$.*+?()[\]{}|]/

export function deburr(value: unknown): string {
  const string = toString(value)
  return string && string.replace(reLatin, deburrLetter).replace(reCombiningMark, '')
}

export function escapeRegExp(value: unknown): string {
  const string = toString(value)
  return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, '\\$&') : string
}

const paths = new Map<string, string[]>()
const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g
const reIsPlainProp = /^\w*$/
const reEscapeChar = /\\(\\)?/g
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/

export function get(object: any, path: string): any {
  if (object == null) return undefined
  if (reIsPlainProp.test(path) || !reIsDeepProp.test(path) || path in Object(object)) return object[path]
  // Match Lodash's bounded path cache, including clearing on a cached lookup.
  if (paths.size === 500) paths.clear()
  let parts = paths.get(path)
  if (!parts) {
    parts = path.charCodeAt(0) === 46 ? [''] : []
    path.replace(rePropName, (match, number, quote, substring) => {
      parts!.push(quote ? substring.replace(reEscapeChar, '$1') : number || match)
      return match
    })
    paths.set(path, parts)
  }
  for (const part of parts) {
    if (object == null) return undefined
    object = object[part]
  }
  return parts.length ? object : undefined
}

/** The public cache contract historically inferred from Lodash's MapCache. */
export interface MemoizationCache {
  delete(key: any): boolean
  get(key: any): any
  has(key: any): boolean
  set(key: any, value: any): this
  clear?: (() => void) | undefined
}

class Cache extends Map<unknown, unknown> {
  override get(key: unknown): any {
    const value = super.get(key)
    // Lodash's primitive-key hash treats this literal as its undefined sentinel.
    return value === '__lodash_hash_undefined__' &&
      (key === null || ['string', 'number', 'symbol', 'boolean'].includes(typeof key)) &&
      key !== '__proto__'
      ? undefined
      : value
  }
}

export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver: (...args: Parameters<T>) => unknown,
): T & { cache: MemoizationCache } {
  const memoized = function (this: unknown, ...args: Parameters<T>) {
    const key = resolver.apply(this, args)
    const cache = memoized.cache
    if (cache.has(key)) return cache.get(key)
    const result = func.apply(this, args)
    memoized.cache = cache.set(key, result) || cache
    return result
  } as T & { cache: MemoizationCache }
  memoized.cache = new Cache()
  return memoized
}

// Only numeric values and precision 4 reach this helper from the scoring API.
export function round(number: number, precision: number): number {
  if (!Number.isFinite(number)) return Math.round(number)
  let pair = (toString(number) + 'e').split('e')
  const value = Math.round(+(pair[0] + 'e' + (+pair[1]! + precision)))
  pair = (toString(value) + 'e').split('e')
  return +(pair[0] + 'e' + (+pair[1]! - precision))
}
