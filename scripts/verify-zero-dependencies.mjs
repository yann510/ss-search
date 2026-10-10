#!/usr/bin/env node
// Run from the repository root: node scripts/verify-zero-dependencies.mjs
// BASELINE_REF, VERIFY_SAMPLES, VERIFY_SAMPLE_MS, VERIFY_CASE and VERIFY_REPORT are optional.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir, cpus, platform, arch } from 'node:os'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { performance } from 'node:perf_hooks'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(root, 'ss-search/src/lib/ss-search.ts')
const baselineRef = process.env.BASELINE_REF || '8342172036e1a4418030ae4442d65a40b1d3159f'
const samples = Math.max(9, Number(process.env.VERIFY_SAMPLES || 25))
const sampleMs = Math.max(10, Number(process.env.VERIFY_SAMPLE_MS || 30))
const caseFilter = process.env.VERIFY_CASE ? new RegExp(process.env.VERIFY_CASE) : null
const scratch = await mkdtemp(resolve(tmpdir(), 'ss-search-verify-'))
const report = {
  baselineRef,
  baselineCommit: execFileSync('git', ['rev-parse', baselineRef], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version,
  machine: { platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length },
  samples,
  sampleMs,
  caseFilter: process.env.VERIFY_CASE || null,
  policy:
    'Bundle bytes must not increase. Performance flags require median candidate/baseline > 1.05 and paired bootstrap 95% lower bound > 1.02; flagged cases require a separate confirmation run. Timings are local evidence, not proof of zero regression.',
  bundles: [],
  performance: [],
}
const baselineSource = execFileSync('git', ['show', `${baselineRef}:ss-search/src/lib/ss-search.ts`], { cwd: root, encoding: 'utf8' })
const candidateSource = await readFile(sourcePath, 'utf8')
const sources = { baseline: baselineSource, candidate: candidateSource }

function sizes(bytes) {
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, brotli: brotliCompressSync(bytes).length }
}
async function bundle(source, format, consumer) {
  const result = await build({
    stdin: { contents: source, loader: 'ts', resolveDir: dirname(sourcePath), sourcefile: 'verification.ts' },
    bundle: true,
    minify: true,
    treeShaking: true,
    write: false,
    platform: consumer ? 'browser' : 'neutral',
    mainFields: ['module', 'main'],
    target: 'es2020',
    format,
    metafile: true,
  })
  return { bytes: result.outputFiles[0].contents, inputs: Object.keys(result.metafile.inputs) }
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
let seed = 123456789
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0
  return seed / 4294967296
}
function confidence(ratios) {
  const boot = Array.from({ length: 3000 }, () =>
    median(Array.from({ length: ratios.length }, () => ratios[Math.floor(random() * ratios.length)])),
  ).sort((a, b) => a - b)
  return [boot[Math.floor(boot.length * 0.025)], boot[Math.floor(boot.length * 0.975)]]
}
function dataset(count, kind) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: kind === 'ascii' ? `Product ${i} precision steel motor` : `Crème brûlée ${i} façade Æther Straße`,
    description: i % 5 ? 'durable compact system used for assembly operations' : 'precision durable steel motor',
    details: { title: `assembly ${i % 13}`, tags: [{ name: 'steel' }, { name: 'compact' }] },
  }))
}
let sink
function timed(operation, iterations) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) sink = operation()
  return (performance.now() - start) / iterations
}

try {
  const modules = {}
  for (const [label, source] of Object.entries(sources)) {
    const compiled = await bundle(source, 'esm', false)
    const outputPath = resolve(scratch, `${label}.mjs`)
    await writeFile(outputPath, compiled.bytes)
    modules[label] = await import(pathToFileURL(outputPath).href)
    for (const format of ['esm', 'cjs']) {
      const standalone = await bundle(source, format, false)
      const consumerSource = `import { search } from ${JSON.stringify(outputPath)}; export function find(rows, query) { return search(rows, ['name', 'details.title'], query); }`
      const consumer = await bundle(consumerSource, format, true)
      for (const [kind, result] of [
        ['standalone', standalone],
        ['search-only-consumer', consumer],
      ]) {
        report.bundles.push({
          label,
          format,
          kind,
          ...sizes(result.bytes),
          runtimeImports: label === 'candidate' ? result.inputs.filter((path) => path.includes('node_modules')) : undefined,
        })
      }
    }
  }
  const base = modules.baseline
  const next = modules.candidate
  const keysByKind = {
    ascii: ['name', 'description'],
    accents: ['name', 'description'],
    nested: ['name', 'details.title', 'details.tags[name]'],
  }
  let assertions = 0
  for (const count of [100, 1000, 10000]) {
    for (const kind of ['ascii', 'accents', 'nested']) {
      const rows = dataset(count, kind)
      const keys = keysByKind[kind]
      const query = kind === 'ascii' ? 'precision motor' : kind === 'accents' ? 'creme facade' : 'assembly steel'
      for (const text of [query, '', 'no-result-928374', '.*[]^$', 'Æther Straße', 'compact assembly']) {
        for (const withScore of [false, true]) {
          base.convertToSearchableStrings.cache.clear()
          next.convertToSearchableStrings.cache.clear()
          assert.deepEqual(
            next.search(rows, keys, text, { withScore }),
            base.search(rows, keys, text, { withScore }),
            `${count}/${kind}/${text}/${withScore}`,
          )
          assertions++
        }
      }
      for (const mode of ['cold-index', 'cached-plain', 'cached-no-result', 'cached-scored']) {
        if (caseFilter && !caseFilter.test(`${count}/${kind}/${mode}`)) continue
        const performanceQuery = mode === 'cached-no-result' ? 'no-result-928374' : query
        const operations = [base, next].map((module) => {
          module.convertToSearchableStrings.cache.clear()
          if (mode !== 'cold-index') module.search(rows, keys, performanceQuery)
          return mode === 'cold-index'
            ? () => {
                module.convertToSearchableStrings.cache.clear()
                return module.convertToSearchableStrings(rows.slice(), keys, null)
              }
            : () => module.search(rows, keys, performanceQuery, { withScore: mode === 'cached-scored' })
        })
        // Warm both implementations and calibrate a common operation count.
        let iterations = 1
        for (let warm = 0; warm < 3; warm++) for (const operation of operations) timed(operation, Math.max(3, iterations))
        const slowest = Math.max(...operations.map((operation) => timed(operation, 3)))
        iterations = Math.max(1, Math.min(100000, Math.ceil(sampleMs / slowest)))
        const measurements = [[], []]
        for (let sample = 0; sample < samples; sample++) {
          const order = sample % 2 ? [1, 0] : [0, 1]
          for (const index of order) measurements[index].push(timed(operations[index], iterations))
        }
        const ratios = measurements[1].map((duration, i) => duration / measurements[0][i])
        const ratio = median(ratios)
        const ci = confidence(ratios)
        const flagged = ratio > 1.05 && ci[0] > 1.02
        const row = {
          count,
          kind,
          mode,
          iterations,
          baselineMs: median(measurements[0]),
          candidateMs: median(measurements[1]),
          ratio,
          ci95: ci,
          flagged,
          pairedRatios: ratios,
          baselineSamplesMs: measurements[0],
          candidateSamplesMs: measurements[1],
        }
        report.performance.push(row)
        console.log(
          `${count} ${kind} ${mode}: candidate/baseline ${ratio.toFixed(3)} [${ci.map((x) => x.toFixed(3)).join(', ')}]${flagged ? ' FLAG' : ''}`,
        )
      }
    }
  }
  report.resultEqualityAssertions = assertions
  report.lastResultLength = sink?.length
  report.bundleRegressions = report.bundles
    .filter((entry) => entry.label === 'candidate')
    .flatMap((entry) => {
      const original = report.bundles.find(
        (other) => other.label === 'baseline' && entry.format === other.format && entry.kind === other.kind,
      )
      return ['raw', 'gzip', 'brotli']
        .filter((metric) => entry[metric] > original[metric])
        .map((metric) => ({ format: entry.format, kind: entry.kind, metric, baseline: original[metric], candidate: entry[metric] }))
    })
  report.runtimeDependencies = report.bundles.filter((entry) => entry.label === 'candidate').flatMap((entry) => entry.runtimeImports)
  report.performanceFlags = report.performance.filter((entry) => entry.flagged).length
  report.passed = !report.bundleRegressions.length && !report.runtimeDependencies.length && !report.performanceFlags
  console.table(report.bundles.map(({ label, format, kind, raw, gzip, brotli }) => ({ label, format, kind, raw, gzip, brotli })))
  console.log(
    `Equality: ${assertions} comparisons passed; performance flags: ${report.performanceFlags}; validation: ${report.passed ? 'PASS' : 'FAIL'}`,
  )
  if (!report.passed) process.exitCode = 1
} catch (error) {
  report.error = error.stack
  report.passed = false
  process.exitCode = 1
  console.error(error)
} finally {
  if (process.env.VERIFY_REPORT) await writeFile(resolve(process.env.VERIFY_REPORT), `${JSON.stringify(report, null, 2)}\n`)
  await rm(scratch, { recursive: true, force: true })
}
