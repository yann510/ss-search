import { data } from './data'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import Benchmark from 'benchmark'
import { difference } from 'lodash'

enum OperationType {
  Search,
}

export interface BenchmarkResult {
  version: string
  operationType: OperationType
  operationsPerSecond: number
  runsSampled: number
}

const benchmarkResultPath = `${__dirname}/../../../../web-app/src/assets/benchmarkResults.json`
const ignoredVersions = ['1.9.1', '1.10.0', '1.10.1']

async function main() {
  const packageVersions: string[] = JSON.parse(execSync('npm view ss-search versions --json').toString())

  let benchmarkResults: BenchmarkResult[] = existsSync(benchmarkResultPath) ? JSON.parse(readFileSync(benchmarkResultPath).toString()) : []

  const missingVersionsToBenchmark = difference(
    packageVersions,
    benchmarkResults.map((x) => x.version)
  )

  for (const version of missingVersionsToBenchmark) {
    if (ignoredVersions.includes(version)) {
      console.info(`Ignoring version ${version}`)
      continue
    }

    console.log(`Benchmarking version ${version}`)
    execSync(`npm i --prefix ${__dirname} ss-search@${version}`)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const lib = await import('ss-search')

    new Benchmark.Suite()
      // add tests
      .add(
        'search',
        () => {
          lib.search(data, Object.keys(data[0]), 'l o r a w e l l s Lesmuf')
        },
        { minSamples: 200 }
      )
      // add listeners
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('cycle', (event: any) => {
        const benchmarkResult: BenchmarkResult = {
          version,
          operationType: OperationType.Search,
          operationsPerSecond: event.target.hz,
          runsSampled: event.target.stats.sample.length,
        }
        benchmarkResults = [...benchmarkResults, benchmarkResult]

        writeFileSync(benchmarkResultPath, JSON.stringify(benchmarkResults, null, 2))

        console.log(`Benchmarked version ${version} - ${event.target}`)
      })
      .run({ minSamples: 200 })
  }
}

main()
