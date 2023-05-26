import * as chai from "chai"
import { getScore } from "../src"

const expect = chai.expect

describe("index", () => {
    describe("#getScore", () => {
        it("Should return 0 when search doesn't match all search words", () => {
            // Arrange
            const matchesAllSearchWords = false
            const searchWords = ["test"]
            const searchableDataString = "test"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(0)
        })

        it("Should return a score of 1 on perfect match", () => {
            // Arrange
            const matchesAllSearchWords = true
            const searchWords = ["test"]
            const searchableDataString = "test"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(1)
        })

        it("Should remove non word characters when calculating score, thus this test should return a score of 1", () => {
            // Arrange
            const matchesAllSearchWords = true
            const searchWords = ["test", "with", "non", "word", "characters"]
            const searchableDataString = "test with.non,word:characters;"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(1)
        })

        it("Should return a score of 0.5 as only half the data matches the search string", () => {
            // Arrange
            const matchesAllSearchWords = true
            const searchWords = ["foo"]
            const searchableDataString = "bar foo"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(0.5)
        })

        it("Should not return a score greater than 1", () => {
            // Arrange
            const matchesAllSearchWords = true
            const searchWords = ["foo", "foo", "foo"]
            const searchableDataString = "bar foo"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(0.5)
        })

        it("Should return a score of 15/44 even though search words contains part of words of the searchableDataString", () => {
            // Arrange
            const matchesAllSearchWords = true
            const searchWords = ["search", "searching"]
            const searchableDataString = "searching is the key to a good user experience (search)"

            // Act
            const actual = getScore(matchesAllSearchWords, searchWords, searchableDataString)

            // Assert
            expect(actual).to.be.eql(+(15 / 44).toFixed(4))
        })
    })
})
