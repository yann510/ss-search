const dream = require("dreamjs")
const fs = require("fs")

function generateData() {
    const chunkSize = 100_000
    for (let i = 0; i < 10; i++) {
        dream.customType("incrementalId", function (helper) {
            return helper.previousItem ? helper.previousItem.id + 1 : i * chunkSize + 1
        })

        dream
            .schema({
                id: "incrementalId",
                name: "name",
                age: "age",
                address: "address",
            })
            .generateRnd(chunkSize)
            .output(function (err, result) {
                fs.writeFileSync(`public/data-chunk-${i}.json`, JSON.stringify(result))
            })
    }
}

generateData()
