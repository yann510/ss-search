import * as chai from "chai"
import { tokenize } from "../src"

const expect = chai.expect

describe("index", () => {
    describe("#tokenize", () => {
        it("Should return empty array when null is passed", () => {
            // Arrange
            const text: any = null

            // Act
            const actual = tokenize(text)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should transform text into an array of words", () => {
            // Arrange
            const text = "I will now get,  split into tokens; by this lovely.: tokenization' function"

            // Act
            const actual = tokenize(text)

            // Assert
            const expected = ["i", "will", "now", "get", "split", "into", "tokens", "by", "this", "lovely", "tokenization", "function"]
            expect(actual).to.be.eql(expected)
        })
    })
})
