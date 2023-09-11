import { convertToSearchableStrings } from './ss-search'
import { describe, test, expect } from 'vitest'

type Data = object

describe('#convertToSearchableStrings', () => {
  test('Should return empty array when data is null', () => {
    // Arrange
    const data = null
    const keys = ['key']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([])
  })

  test('Should return empty array when data is empty', () => {
    // Arrange
    const data: Data[] = []
    const keys = ['key']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([])
  })

  test('Should return empty array when key is null', () => {
    // Arrange
    const data: Data[] = [{}]
    const keys = null

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([])
  })

  test('Should return empty array when key is empty', () => {
    // Arrange
    const data = [{}]
    const keys: string[] = []

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([])
  })

  test('Should concat all property values', () => {
    // Arrange
    const data = [{ name: 'ss-search', description: 'simply stupid' }]
    const keys = Object.keys(data[0])

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['ss-searchsimply stupid'])
  })

  test('Should ignore null/undefined/functions types', () => {
    // Arrange
    const data = [
      {
        undefined: undefined,
        null: null,
        function: () => {
          console.log("I'm a function")
        },
      },
    ]
    const keys = Object.keys(data[0])

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([''])
  })

  test('Should handle basic types properly (boolean, number, string)', () => {
    // Arrange
    const data = [
      {
        boolean: true,
        number: 1,
        text: 'string',
      },
    ]
    const keys = Object.keys(data[0])

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['true1string'])
  })

  test('Should convert object to json string', () => {
    // Arrange
    const data = [
      {
        object: { nestedProperty: 'value' },
      },
    ]
    const keys = Object.keys(data[0])

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['{"nestedproperty":"value"}'])
  })

  test('Should extract nested object property', () => {
    // Arrange
    const data = [
      {
        object: { nestedProperty: 'value' },
      },
    ]
    const keys = ['object.nestedProperty']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['value'])
  })

  test('Should convert array to json string', () => {
    // Arrange
    const data = [
      {
        array: ['value1', 'value2'],
      },
    ]
    const keys = Object.keys(data[0])

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['["value1","value2"]'])
  })

  test("Should extract array object value when using the '[]' notation as the key selector", () => {
    // Arrange
    const data = [
      {
        object: { nestedProperty: 'value' },
        array: [{ prop1: 'value1', prop2: 'value2' }],
      },
      {
        object: { nestedProperty: 'value' },
      },
    ]
    const keys = ['array[prop2]']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual(['value2', ''])
  })

  test('Should return empty string when the elements value provided is not an object', () => {
    // Arrange
    const data = ['string']
    const keys = ['']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([''])
  })

  test('Should return empty string when the key is missing from the object', () => {
    // Arrange
    const data = [{ key: 'value' }]
    const keys = ['invalidKey']

    // Act
    const actual = convertToSearchableStrings(data, keys)

    // Assert
    expect(actual).toEqual([''])
  })
})
