import * as chai from "chai"
import { search } from "../src"

const expect = chai.expect

const dataset = [
    {
        number: 1,
        text: "A search function should be fast",
    },
    {
        number: 2,
        text: "A search function should provide accurate results",
    },
    {
        number: 3,
        text: "A search function should return results that match everything provided in the search text",
    },
    {
        number: 4,
        text: "Функция поиска должна искать не только по латинскому алфавиту, но и по другим",
    },
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

        it("Should return elements when searchText is an empty string", function () {
            // Arrange
            const data = dataset
            const keys = Object.keys(data[0])
            const searchText = ""

            // Act
            const actual = search(data, keys, searchText)

            // Assert
            expect(actual).to.be.eql(data)
        })

        it("Should return scored results when score option is activated", function () {
            // Arrange
            const data = dataset.slice(0, 1)
            const keys = ["number"]
            const searchText = "1"

            // Act
            const actual = search(data, keys, searchText, { withScore: true })

            // Assert
            expect(actual).to.be.eql([{ element: data[0], score: 1 }])
        })

        it("Should match non-latin alphabets equally well as the latin", function() {
            // Arrange
            const data = dataset.slice(0, 4)
            const keys = Object.keys(data[0])
            const searchText = "должна искать"

            // Act
            const actual = search(data, keys, searchText)

            // Assert
            expect(actual).to.be.eql([{ ...data[3] }])
        })
    })
})
