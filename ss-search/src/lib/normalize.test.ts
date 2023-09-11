import { normalize } from './ss-search'

describe('#normalize', () => {
  test('Should return empty string when null is passed', () => {
    // Arrange
    const basicText = undefined

    // Act
    const actual = normalize(basicText)

    // Assert
    expect(actual).toEqual('')
  })

  test('Should keep the original text as it is simple', () => {
    // Arrange
    const basicText = 'this search library is so simple, yet so good'

    // Act
    const actual = normalize(basicText)

    // Assert
    expect(actual).toEqual(basicText)
  })

  test('Should replace accent chars', () => {
    // Arrange
    const accentText = 'thís séârch lîbräry ïs sô sïmplÉ, yet sÖ gòöd'

    // Act
    const actual = normalize(accentText)

    // Assert
    const expected = 'this search library is so simple, yet so good'
    expect(actual).toEqual(expected)
  })
})
