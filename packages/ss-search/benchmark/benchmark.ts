import { data } from "./data"
import { exec, execSync } from "child_process"
import { readFileSync, writeFileSync, existsSync } from "fs"
import difference from "lodash/difference"
// @ts-ignore
import { search } from "ss-search"
import Benchmark from "benchmark"

enum OperationType {
    Search,
}

interface BenchmarkResult {
    version: string
    operationType: OperationType
    operationsPerSecond: number
    runsSampled: number
}

const benchmarkResultPath = `${__dirname}/benchmarkResults.json`

const packageVersions: string[] = JSON.parse(execSync("npm view ss-search versions --json").toString())

let benchmarkResults: BenchmarkResult[] = existsSync(benchmarkResultPath) ? JSON.parse(readFileSync(benchmarkResultPath).toString()) : []

const missingVersionsToBenchmark = difference(
    packageVersions,
    benchmarkResults.map((x) => x.version),
)

for (const version of missingVersionsToBenchmark) {
    execSync(`cd ${__dirname} && npm i --prefix ./ ss-search@${version}`).toString()

    const suite = new Benchmark.Suite()

    // add tests
    suite
        .add(
            "search",
            function () {
                search(data, Object.keys(data[0]), "l o r a w e l l s Lesmuf")
            },
            { minSamples: 200 },
        )
        // add listeners
        .on("cycle", function (event: any) {
            const benchmarkResult: BenchmarkResult = {
                version,
                operationType: OperationType.Search,
                operationsPerSecond: event.target.hz,
                runsSampled: event.target.stats.sample.length,
            }
            benchmarkResults = [...benchmarkResults, benchmarkResult]

            writeFileSync(benchmarkResultPath, JSON.stringify(benchmarkResults, null, 2))

            console.log(`Benchmarked versrion ${version} - ${event.target}`)
        })
        .run({ minSamples: 200 })
}
