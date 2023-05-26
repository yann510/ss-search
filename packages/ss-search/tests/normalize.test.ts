import * as chai from "chai"
import { normalize } from "../src"

const expect = chai.expect

describe("index", () => {
    describe("#normalize", () => {
        it("Should return empty string when null is passed", () => {
            // Arrange
            const baiscText: any = null

            // Act
            const actual = normalize(baiscText)

            // Assert
            expect(actual).to.be.eql("")
        })

        it("Should keep the original text as it is simple", () => {
            // Arrange
            const baiscText = "this search library is so simple, yet so good"

            // Act
            const actual = normalize(baiscText)

            // Assert
            expect(actual).to.be.eql(baiscText)
        })

        it("Should replace accent chars", () => {
            // Arrange
            const accentText = "thís séârch lîbräry ïs sô sïmplÉ, yet sÖ gòöd"

            // Act
            const actual = normalize(accentText)

            // Assert
            const expected = "this search library is so simple, yet so good"
            expect(actual).to.be.eql(expected)
        })
    })
})
