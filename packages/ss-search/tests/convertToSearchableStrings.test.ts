import * as chai from "chai"
import { convertToSearchableStrings } from "../src"

const expect = chai.expect

describe("index", () => {
    describe("#convertToSearchableStrings", () => {
        it("Should return empty array when data is null", () => {
            // Arrange
            const data: any = null
            const keys: any = ["key"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when data is empty", () => {
            // Arrange
            const data: any = []
            const keys: any = ["key"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when key is null", () => {
            // Arrange
            const data: any = [{}]
            const keys: any = null

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should return empty array when key is empty", () => {
            // Arrange
            const data: any = [{}]
            const keys: any = []

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([])
        })

        it("Should concat all property values", () => {
            // Arrange
            const data = [{ name: "ss-search", description: "simply stupid" }]
            const keys = Object.keys(data[0])

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["ss-searchsimply stupid"])
        })

        it("Should ignore null/undefined/functions types", () => {
            // Arrange
            const data = [
                {
                    "undefined": undefined,
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

        it("Should handle basic types properly (boolean, number, string)", () => {
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

        it("Should convert object to json string", () => {
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

        it("Should extract nested object property", () => {
            // Arrange
            const data = [
                {
                    object: { nestedProperty: "value" },
                },
            ]
            const keys = ["object.nestedProperty"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["value"])
        })

        it("Should convert array to json string", () => {
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

        it("Should extract array object value when using the '[]' notation as the key selector", () => {
            // Arrange
            const data = [
                {
                    object: { nestedProperty: "value" },
                    array: [{ prop1: "value1", prop2: "value2" }],
                },
                {
                    object: { nestedProperty: "value" },
                },
            ]
            const keys = ["array[prop2]"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql(["value2", ""])
        })

        it("Should return empty string when the elements value provided is not an object", () => {
            // Arrange
            const data = ["string"]
            const keys = [""]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([""])
        })

        it("Should return empty string when the key is missing from the object", () => {
            // Arrange
            const data = [{ key: "value" }]
            const keys = ["invalidKey"]

            // Act
            const actual = convertToSearchableStrings(data, keys)

            // Assert
            expect(actual).to.be.eql([""])
        })
    })
})
