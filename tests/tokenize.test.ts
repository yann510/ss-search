import * as chai from "chai";
import { tokenize } from '../src';

const expect = chai.expect;

describe("index", function () {
    describe("#tokenize", function () {
        it("Should transform text into an array of words", function () {
            // Arrange
            const text = "I will now get,  split into tokens; by this lovely.: tokenization' function"

            // Act
            const actual = tokenize(text)

            // Assert
            const expected = ["i", "will", "now", "get", "split", "into", "tokens", "by", "this", "lovely", "tokenization", "function"]
            expect(actual).to.be.eql(expected)
        });
    });
});
