import deburr from "lodash/deburr"
import escapeRegExp from "lodash/escapeRegExp"
import memoize from "lodash/memoize"
import get from "lodash/get"
import round from "lodash/round"

export function normalize(text: string) {
    return deburr(text)
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim()
}

export function tokenize(searchText: string): string[] {
    return normalize(escapeRegExp(searchText)).match(/[\p{L}\d]+/gium) || []
}

export const convertToSearchableStrings = memoize(<T>(elements: T[], searchableKeys: string[]) => {
    if (!elements || elements.length === 0 || !searchableKeys || searchableKeys.length === 0) {
        return []
    }

    const arraySelectorRegex = /\[(.*)]/
    return elements
        .map((element) =>
            searchableKeys
                .map((key) => {
                    const arraySelector = get(arraySelectorRegex.exec(key), "1")

                    const value = get(element, key.replace(arraySelectorRegex, ""))
                    if (!arraySelector && (value === null || value === undefined || typeof value === "function")) {
                        return ""
                    }

                    if (arraySelector) {
                        return value.map((x: any) => get(x, arraySelector))
                    }

                    if (Array.isArray(value) || typeof value === "object") {
                        return JSON.stringify(value)
                    }

                    return value
                })
                .reduce((a, b) => a + b, ""),
        )
        .map((x) => normalize(x))
})

export const indexDocuments = convertToSearchableStrings

export const getScore = (matchesAllSearchWords: boolean, searchWords: string[], searchableDataString: string) => {
    if (!matchesAllSearchWords) {
        return 0
    }

    const searchableDataStringWithoutNonWordCharacters = searchableDataString.replace(/[^\p{L}\d]+/gium, "")
    const remainingTextAfterRemovingSearchWords = searchWords
        .sort((a, b) => b.length - a.length)
        .reduce((remainingText, searchWord) => remainingText.replace(new RegExp(searchWord, "gm"), ""), searchableDataStringWithoutNonWordCharacters)
    return round(1 - remainingTextAfterRemovingSearchWords.length / searchableDataStringWithoutNonWordCharacters.length, 4)
}

export function search<T>(elements: T[], searchableKeys: string[], searchText: string, options: { withScore?: boolean } = {}) {
    if (!searchText) {
        return elements
    }

    const searchWords = tokenize(searchText)

    const searchableDataStrings = convertToSearchableStrings(elements, searchableKeys)

    return searchableDataStrings
        .map((x, i) => {
            const matchesAllSearchWords = searchWords.filter((searchWord) => x.indexOf(searchWord) > -1).length === searchWords.length
            if (options.withScore) {
                const score = getScore(matchesAllSearchWords, searchWords, x)
                return { element: elements[i], score }
            }

            return (matchesAllSearchWords ? elements[i] : null) as T
        })
        .filter((x) => x)
}
