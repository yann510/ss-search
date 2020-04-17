import * as chai from "chai"
import { search } from '../src';

const expect = chai.expect

const dataset = [
    {
        number: 1,
        text: "A search function should be fast",
    },
    {
        number: 2,
        text: "A search function should provide accurate results"
    },
    {
        number: 3,
        text: "A search function should return results that match everything provided in the search text"
    }
]

describe("index", function () {
    describe("#search", function () {
        it("Should match all data", function () {
            // Arrange
            const data = dataset.slice(0, 2)
            const keys = Object.keys(data[0])
            const searchText = "search function"

            // Act
            const actual = search(data, keys, searchText)

            // Assert
            expect(actual).to.be.eql(data)
        })

        it("Should match every search word (so number 3 only)", function () {
            // Arrange
            const data = dataset.slice(0, 3)
            const keys = Object.keys(data[0])
            const searchText = "search function 3"

            // Act
            const actual = search(data, keys, searchText)

            // Assert
            expect(actual).to.be.eql([data[2]])
        })
    })
})
