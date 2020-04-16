import * as chai from "chai"
import { convertToSearchableStrings } from "../src"

const expect = chai.expect

describe("index", function () {
    describe("#convertToSearchableStrings", function () {
        it("Should return empty array when data is null", function () {
            // Arrange
            const data: any = null
            const keys: any = ["key"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when data is empty", function () {
            // Arrange
            const data: any = []
            const keys: any = ["key"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when key is null", function () {
            // Arrange
            const data: any = [{}]
            const keys: any = null

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when key is empty", function () {
            // Arrange
            const data: any = [{}]
            const keys: any = []

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should concat all property values", function () {
            // Arrange
            const data = [{ name: "ss-search", description: "simply stupid" }]
            const keys = Object.keys(data[0])

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["ss-searchsimply stupid"])
        })

        it("Should ignore null/undefined/functions types", function () {
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
            expect(actual).to.be.eql([""])
        })

        it("Should handle basic types properly (boolean, number, string)", function () {
            // Arrange
            const data = [
                {
                    boolean: true,
                    number: 1,
                    text: "string",
                },
            ]
            const keys = Object.keys(data[0])

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["true1string"])
        })

        it("Should convert object to json string", function () {
            // Arrange
            const data = [
                {
                    object: { nestedProperty: "value" },
                },
            ]
            const keys = Object.keys(data[0])

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(['{"nestedproperty":"value"}'])
        })

        it("Should convert array to json string", function () {
            // Arrange
            const data = [
                {
                    array: ["value1", "value2"],
                },
            ]
            const keys = Object.keys(data[0])

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(['["value1","value2"]'])
        })

        it("Should extract array object value when using the '.' notation as the key selector", function () {
            // Arrange
            const data = [
                {
                    array: [{ prop1: "value1", prop2: "value2" }],
                },
            ]
            const keys = ["array.prop2"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["value2"])
        })
    })
})
