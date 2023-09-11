import { tokenize } from './ss-search'

describe('#tokenize', () => {
  test('Should return empty array when null is passed', () => {
    // Arrange
    const text = undefined

    // Act
    const actual = tokenize(text)

    // Assert
    expect(actual).toEqual([])
  })

  test('Should transform text into an array of words', () => {
    // Arrange
    const text = "I will now get,  split into tokens; by this lovely.: tokenization' function"

    // Act
    const actual = tokenize(text)

    // Assert
    const expected = ['i', 'will', 'now', 'get', 'split', 'into', 'tokens', 'by', 'this', 'lovely', 'tokenization', 'function']
    expect(actual).toEqual(expected)
  })
})
