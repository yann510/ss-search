import { deburr, escapeRegExp, memoize, get } from "lodash"

export function normalize(text: string) {
    return deburr(text)
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim()
}

export function tokenize(searchText: string): string[] {
    return normalize(escapeRegExp(searchText)).match(/\w+/gim) || []
}

export const convertToSearchableStrings = memoize((elements: any[], searchableKeys: string[]) => {
    if (!elements || elements.length === 0 || !searchableKeys || searchableKeys.length === 0) {
        return []
    }

    return elements
        .map((element) =>
            searchableKeys
                .filter((key) => {
                    const value = get(element, key)

                    return key.includes(".") || (value != null && typeof value !== "function")
                })
                .map((key) => {
                    const keys = key.split(".")
                    const firstKeyValue = get(element, keys[0])

                    const isArrayWithNestedProperties = Array.isArray(firstKeyValue) && keys.length > 1
                    if (isArrayWithNestedProperties) {
                        return firstKeyValue.map((x: any) => get(x, keys.slice(1, keys.length)))
                    }

                    if (Array.isArray(firstKeyValue) || typeof firstKeyValue === "object") {
                        return JSON.stringify(firstKeyValue)
                    }

                    return firstKeyValue
                })
                .reduce((a, b) => a + b, ""),
        )
        .map((x) => normalize(x))
})

export function search<T>(elements: T[], searchableKeys: string[], searchText: string) {
    const searchWords = tokenize(searchText)

    const searchableDataStrings = convertToSearchableStrings(elements, searchableKeys)

    return searchableDataStrings
        .map((x, i) => (searchWords.filter((searchWord) => x.indexOf(searchWord) > -1).length === searchWords.length ? elements[i] : null))
        .filter((x) => x)
}
