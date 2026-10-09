import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releasePackage, requestJson, releaseNotes, validatePack, matchingLocks, createRuntime } from './release-package.mjs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

// Removing reconciliation, preflight, or verification must make these fail.
function fixture({
  github = null,
  npm = null,
  candidate = { tag: 'ss-searchv1.13.3', version: '1.13.3', sha: 'abc', body: 'notes' },
} = {}) {
  const actions = []
  const io = {
    preflight: async () => actions.push('preflight'),
    candidate: async () => candidate,
    assertCandidate: async () => undefined,
    assertPublication: async () => undefined,
    github: async () => github,
    npm: async () => npm,
    build: async () => {
      actions.push('build')
      return { name: 'ss-search', version: '1.13.3', integrity: 'sha512-fixture' }
    },
    createRelease: async (c) => {
      actions.push('github')
      github = { tag_name: c.tag, draft: false, prerelease: false }
    },
    publish: async (artifact) => {
      actions.push('npm')
      npm = { name: artifact.name, version: artifact.version, dist: { integrity: artifact.integrity } }
    },
    normal: async () => actions.push('normal'),
  }
  return { io, actions }
}
const existingGithub = { tag_name: 'ss-searchv1.13.3', draft: false, prerelease: false }
const existingNpm = { name: 'ss-search', version: '1.13.3', dist: { integrity: 'sha512-fixture' } }

test('recovers existing tag missing both destinations before normal versioning', async () => {
  const { io, actions } = fixture()
  await releasePackage(io)
  assert.deepEqual(actions, ['preflight', 'build', 'github', 'npm', 'normal'])
})
test('complete release skips recovery writes', async () => {
  const { io, actions } = fixture({ github: existingGithub, npm: existingNpm })
  await releasePackage(io)
  assert.deepEqual(actions, ['preflight', 'normal'])
})
for (const [github, npm, expected] of [
  [existingGithub, null, ['build', 'npm']],
  [null, existingNpm, ['github']],
]) {
  test(`recovers only missing destination (${expected.at(-1)})`, async () => {
    const { io, actions } = fixture({ github, npm })
    await releasePackage(io)
    assert.deepEqual(actions, ['preflight', ...expected, 'normal'])
  })
}
test('first release retains normal Nx behavior', async () => {
  const { io, actions } = fixture({ candidate: null })
  await releasePackage(io)
  assert.deepEqual(actions, ['preflight', 'normal'])
})
test('authentication failure occurs before build, tag, or publication', async () => {
  const { io, actions } = fixture()
  io.preflight = async () => {
    throw new Error('GitHub HTTP 401')
  }
  await assert.rejects(releasePackage(io), /401/)
  assert.deepEqual(actions, [])
})
test('tag change during build stops before publication', async () => {
  const { io, actions } = fixture()
  let checks = 0
  io.assertCandidate = async () => {
    if (++checks > 1) throw new Error('Release tag changed')
  }
  await assert.rejects(releasePackage(io), /tag changed/)
  assert.deepEqual(actions, ['preflight', 'build'])
})
for (const status of ['401', '403', '500', 'network unavailable']) {
  test(`ambiguous destination ${status} cannot become missing`, async () => {
    const { io, actions } = fixture()
    io.github = async () => {
      throw new Error(status)
    }
    await assert.rejects(releasePackage(io), new RegExp(status))
    assert.deepEqual(actions, ['preflight'])
  })
}
for (const [key, value] of [
  ['name', 'other'],
  ['version', '1.11.0'],
]) {
  test(`rejects stale or incorrect built package ${key}`, async () => {
    const { io, actions } = fixture()
    io.build = async () => ({ ...existingNpm, [key]: value })
    await assert.rejects(releasePackage(io), /artifact/)
    assert.deepEqual(actions, ['preflight'])
  })
}
for (const override of [{ tag_name: 'ss-searchv1.11.0' }, { draft: true }, { prerelease: true }]) {
  test(`rejects ambiguous existing release ${JSON.stringify(override)}`, async () => {
    const { io, actions } = fixture({ github: { ...existingGithub, ...override } })
    await assert.rejects(releasePackage(io), /GitHub/)
    assert.deepEqual(actions, ['preflight'])
  })
}
test('rejects mismatched existing npm version before writes', async () => {
  const { io, actions } = fixture({ npm: { ...existingNpm, version: '1.11.0' } })
  await assert.rejects(releasePackage(io), /npm/)
  assert.deepEqual(actions, ['preflight'])
})
test('verifies registry integrity after publication before normal versioning', async () => {
  const { io, actions } = fixture()
  io.publish = async () => actions.push('npm')
  await assert.rejects(releasePackage(io), /verification/)
  assert.deepEqual(actions, ['preflight', 'build', 'github', 'npm'])
})
test('registry content mismatch cannot pass final verification', async () => {
  const { io } = fixture()
  let published = false
  io.publish = async () => {
    published = true
  }
  io.npm = async () => (published ? { ...existingNpm, dist: { integrity: 'sha512-wrong' } } : null)
  await assert.rejects(releasePackage(io), /verification/)
})

for (const status of [401, 403, 500]) {
  test(`real HTTP boundary refuses ${status} rather than treating it as absence`, async () => {
    await assert.rejects(
      requestJson('https://example.test', { missing: true, fetchImpl: async () => ({ status, ok: false }) }),
      new RegExp(String(status)),
    )
  })
}
test('real HTTP boundary accepts only explicit 404 as missing', async () => {
  assert.equal(await requestJson('https://example.test', { missing: true, fetchImpl: async () => ({ status: 404, ok: false }) }), null)
  await assert.rejects(requestJson('https://example.test', { fetchImpl: async () => ({ status: 404, ok: false }) }), /404/)
})
test('network failure cannot expose a secret in response diagnostics', async () => {
  await assert.rejects(
    requestJson('https://example.test', {
      token: 'secret-example',
      fetchImpl: async () => {
        throw new Error('secret-example')
      },
    }),
    (error) => error.message.includes('network') && !error.message.includes('secret-example'),
  )
})
test('release notes must identify exact top tagged version', () => {
  assert.equal(releaseNotes('## 1.13.3 (2026-10-09)\n\nTagged notes\n\n## 1.13.2 (2026-10-09)\nold', '1.13.3'), 'Tagged notes')
  assert.throws(() => releaseNotes('## 1.11.0 (2026-10-09)\nold', '1.13.3'), /changelog/)
})
test('packed content must match checksum and include every export', () => {
  const tarball = Buffer.from('fixture packed content')
  const manifest = { main: './index.js', version: '1.13.3', exports: { '.': { import: './index.js', require: './index.cjs' } } }
  const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`
  const pack = {
    name: 'ss-search',
    version: '1.13.3',
    integrity,
    files: ['package.json', 'index.js', 'index.cjs'].map((path) => ({ path })),
  }
  assert.equal(validatePack(pack, manifest, tarball), integrity)
  assert.throws(() => validatePack(pack, manifest, Buffer.from('wrong content')), /integrity/)
  assert.throws(() => validatePack({ ...pack, files: [{ path: 'package.json' }] }, manifest, tarball), /exports/)
})
test('CI cache normalization still permits identical tagged dependencies', () => {
  const original = { version: '1.8.1', packages: { '': { version: '1.8.1', dependencies: { nx: '23.2.1' } } } }
  const normalized = { packages: { '': { dependencies: { nx: '23.2.1' } } } }
  assert.equal(matchingLocks(JSON.stringify(original), JSON.stringify(normalized)), true)
  normalized.packages[''].dependencies.nx = 'different'
  assert.equal(matchingLocks(JSON.stringify(original), JSON.stringify(normalized)), false)
})

function runtimeFixture(t, { laterChange = true, changes = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'release-test-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  mkdirSync(join(root, 'ss-search'))
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, 'package-lock.json'), '{"packages":{}}\n')
  writeFileSync(join(root, '.gitignore'), 'cache/\n')
  writeFileSync(
    join(root, 'ss-search/package.json'),
    JSON.stringify({
      name: 'ss-search',
      version: '1.11.0',
      main: './index.js',
      exports: { '.': { import: './index.js', require: './index.cjs' } },
    }),
  )
  writeFileSync(join(root, 'ss-search/CHANGELOG.md'), '## 1.13.3 (2026-10-09)\n\nTagged notes\n')
  writeFileSync(join(root, 'ss-search/source.js'), 'tagged content')
  git('init', '-q')
  git('add', '.')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'release fixture')
  git('tag', 'ss-searchv1.13.3')
  const sha = git('rev-parse', 'HEAD')
  // A later checkout must never be packed under the old tag version.
  if (laterChange) {
    writeFileSync(join(root, 'ss-search/source.js'), 'later content')
    git('add', '.')
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'later change')
  }
  if (Object.keys(changes).length) {
    for (const [path, content] of Object.entries(changes)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), content)
    }
    git('add', '.')
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'recovery fixture changes')
  }
  const state = {
    release: null,
    npm: null,
    sha,
    normalRuns: 0,
    publishedContent: null,
    publishCalls: 0,
    remoteTags: ['ss-searchv1.13.3'],
    registry: { name: 'ss-search', versions: {}, 'dist-tags': {} },
    onBuild: () => undefined,
  }
  const environment = {
    ...process.env,
    GITHUB_TOKEN: 'fixture-secret',
    NODE_AUTH_TOKEN: 'fixture-secret',
    npm_config_cache: join(root, 'cache'),
    GITHUB_ACTIONS: 'true',
    GITHUB_SHA: git('rev-parse', 'HEAD'),
    GITHUB_REF: 'refs/heads/master',
    GITHUB_REPOSITORY: 'yann510/ss-search',
    GITHUB_SERVER_URL: 'https://github.com',
  }
  const runtime = createRuntime(root, {
    environment,
    fetchImpl: async (url, options) => {
      if (url.endsWith('/git/matching-refs/tags/ss-searchv'))
        return Response.json(state.remoteTags.map((tag) => ({ ref: `refs/tags/${tag}` })))
      if (url === 'https://registry.npmjs.org/ss-search') return Response.json(state.registry)
      if (url.endsWith('/git/ref/tags/ss-searchv1.13.3')) return Response.json({ object: { type: 'commit', sha: state.sha } })
      if (url.endsWith('/releases') && options.method === 'POST') {
        state.release = JSON.parse(options.body)
        return Response.json(state.release)
      }
      if (url.endsWith('/releases/tags/ss-searchv1.13.3'))
        return state.release ? Response.json(state.release) : new Response('', { status: 404 })
      if (url === 'https://registry.npmjs.org/ss-search/1.13.3')
        return state.npm ? Response.json(state.npm) : new Response('', { status: 404 })
      if (url === 'https://api.github.com/repos/yann510/ss-search')
        return Response.json({ full_name: 'yann510/ss-search', permissions: { push: true } })
      throw new Error('Unexpected fixture request')
    },
    execute: (command, args, options) => {
      if (command === 'npm' && args[0] === 'whoami') return 'fixture-user'
      if (command === 'npx' && args[1] === 'run') {
        state.buildSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: options.cwd, encoding: 'utf8' }).trim()
        const dist = join(options.cwd, 'dist/ss-search')
        mkdirSync(dist, { recursive: true })
        writeFileSync(join(dist, 'package.json'), readFileSync(join(options.cwd, 'ss-search/package.json')))
        const content = readFileSync(join(options.cwd, 'ss-search/source.js'))
        writeFileSync(join(dist, 'index.js'), content)
        writeFileSync(join(dist, 'index.cjs'), content)
        state.publishedContent = content.toString()
        state.onBuild()
        return ''
      }
      if (command === 'npm' && args[0] === 'publish') {
        state.publishCalls++
        const tarball = readFileSync(args[1])
        state.npm = {
          name: 'ss-search',
          version: '1.13.3',
          dist: { integrity: `sha512-${createHash('sha512').update(tarball).digest('base64')}` },
          ...(state.recordGitHead ? { gitHead: environment.GITHUB_SHA } : {}),
        }
        return ''
      }
      if (command === 'npx' && args[1] === 'release') {
        state.normalRuns++
        return ''
      }
      return execFileSync(command, args, options)
    },
  })
  t.after(() => {
    runtime.cleanup()
    rmSync(root, { recursive: true, force: true })
  })
  return { runtime, state, git, environment }
}
test('real runtime builds tagged source, versions only dist, packs and verifies exact content', async (t) => {
  const { runtime, state, git } = runtimeFixture(t, { laterChange: false })
  await releasePackage(runtime)
  assert.equal(state.publishedContent, 'tagged content')
  assert.equal(state.release.tag_name, 'ss-searchv1.13.3')
  assert.equal(state.npm.version, '1.13.3')
  assert.equal(state.normalRuns, 1)
  assert.equal(git('tag', '--list'), 'ss-searchv1.13.3')
  assert.equal(git('status', '--porcelain'), '')
  await releasePackage(runtime)
  assert.equal(state.publishCalls, 1)
  assert.equal(state.normalRuns, 2)
})
test('real runtime fails closed if remote tag differs from local tag', async (t) => {
  const { runtime, state } = runtimeFixture(t)
  state.sha = 'different-commit'
  await assert.rejects(releasePackage(runtime), /commits differ/)
  assert.equal(state.release, null)
  assert.equal(state.npm, null)
  assert.equal(state.normalRuns, 0)
})
test('real Nx no-op cannot falsely verify missing publication', async (t) => {
  const { runtime, state } = runtimeFixture(t)
  await assert.rejects(runtime.normal(), /incomplete release/)
  assert.equal(state.normalRuns, 1)
})
test('real candidate rejects tags outside current history', async (t) => {
  const { runtime, state, git } = runtimeFixture(t)
  git('checkout', '--orphan', 'unrelated')
  git('add', '.')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'unrelated history')
  await assert.rejects(runtime.candidate(), /merge-base failed/)
  assert.equal(state.normalRuns, 0)
})
test('real first-release Nx no-op without any tag fails final verification', async (t) => {
  const { runtime, state, git } = runtimeFixture(t)
  git('tag', '-d', 'ss-searchv1.13.3')
  state.remoteTags = []
  await assert.rejects(releasePackage(runtime), /without a verifiable release tag/)
  assert.equal(state.normalRuns, 1)
})

function npmProvenancePayload(environment) {
  let provenancePath
  for (const directory of process.env.PATH.split(':')) {
    try {
      const npmExecutable = realpathSync(join(directory, 'npm'))
      const path = join(dirname(dirname(npmExecutable)), 'node_modules/libnpmpublish/lib/provenance.js')
      readFileSync(path)
      provenancePath = path
      break
    } catch {
      /* Try next npm installation on PATH. */
    }
  }
  assert.ok(provenancePath, 'Installed npm provenance implementation is required for this regression')
  const code = `const {createRequire} = require('node:module'); const req = createRequire(process.argv[1]); const sigstorePath = req.resolve('sigstore'); req('sigstore'); require.cache[sigstorePath].exports = {attest: async (payload) => JSON.parse(payload)}; req(process.argv[1]).generateProvenance([{name:'pkg:npm/ss-search@1.13.3',digest:{sha512:'fixture'}}], {}).then(payload => console.log(JSON.stringify(payload)));`
  return JSON.parse(
    execFileSync(process.execPath, ['-e', code, provenancePath], {
      encoding: 'utf8',
      env: {
        ...environment,
        GITHUB_WORKFLOW_REF: 'yann510/ss-search/.github/workflows/publish-package.yml@refs/heads/master',
        RUNNER_ENVIRONMENT: 'github-hosted',
      },
    }),
  )
}
test('actual npm provenance payload binds workflow SHA, so changed tagged package inputs must stop before any recovery writes', async (t) => {
  const { runtime, state, environment } = runtimeFixture(t)
  const payload = npmProvenancePayload(environment)
  assert.equal(payload.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit, environment.GITHUB_SHA)
  assert.notEqual(environment.GITHUB_SHA, state.sha)
  await assert.rejects(releasePackage(runtime), /provenance.*tagged source/i)
  assert.equal(state.release, null)
  assert.equal(state.publishCalls, 0)
  assert.equal(state.publishedContent, null)
  assert.equal(state.normalRuns, 0)
})
test('higher remote tag with unchanged local tags blocks recovery writes', async (t) => {
  const { runtime, state } = runtimeFixture(t, { laterChange: false })
  state.remoteTags.push('ss-searchv1.13.4')
  await assert.rejects(releasePackage(runtime), /highest remote/i)
  assert.equal(state.release, null)
  assert.equal(state.publishCalls, 0)
})
test('higher remote tag appearing during build blocks both destination writes', async (t) => {
  const { runtime, state } = runtimeFixture(t, { laterChange: false })
  state.onBuild = () => state.remoteTags.push('ss-searchv1.13.4')
  await assert.rejects(releasePackage(runtime), /highest remote/i)
  assert.equal(state.release, null)
  assert.equal(state.publishCalls, 0)
})
for (const registry of [
  { name: 'ss-search', versions: { '1.13.4': {} }, 'dist-tags': { latest: '1.13.4' } },
  { name: 'ss-search', versions: { '1.13.4': {} }, 'dist-tags': { latest: '1.13.2' } },
  { name: 'ss-search', versions: {}, 'dist-tags': { latest: '1.13.4' } },
]) {
  test(`registry higher version/latest blocks recovery (${JSON.stringify(registry)})`, async (t) => {
    const { runtime, state } = runtimeFixture(t, { laterChange: false })
    state.registry = registry
    await assert.rejects(releasePackage(runtime), /registry.*superseded/i)
    assert.equal(state.release, null)
    assert.equal(state.publishCalls, 0)
  })
}
test('registry latest advancing after GitHub creation blocks npm latest promotion', async (t) => {
  const { runtime, state } = runtimeFixture(t, { laterChange: false })
  const createRelease = runtime.createRelease
  runtime.createRelease = async (candidate) => {
    await createRelease(candidate)
    state.registry = { name: 'ss-search', versions: { '1.13.4': {} }, 'dist-tags': { latest: '1.13.4' } }
  }
  await assert.rejects(releasePackage(runtime), /registry.*superseded/i)
  assert.equal(state.publishCalls, 0)
})
test('workflow source differing only in exact recovery files builds its truthful SHA with identical tagged package inputs', async (t) => {
  const { runtime, state, environment } = runtimeFixture(t, {
    laterChange: false,
    changes: {
      '.github/workflows/publish-package.yml': '# recovery workflow',
      'scripts/release-package.mjs': '// wrapper fixture',
      'scripts/release-package.test.mjs': '// regression fixture',
      'scripts/RELEASE.md': 'Recovery fixture notes',
    },
  })
  state.recordGitHead = true
  assert.notEqual(environment.GITHUB_SHA, state.sha)
  await releasePackage(runtime)
  assert.equal(state.buildSha, environment.GITHUB_SHA)
  assert.equal(state.publishedContent, 'tagged content')
  assert.equal(state.npm.gitHead, environment.GITHUB_SHA)
  assert.equal(state.npm.version, '1.13.3')
  assert.equal(state.publishCalls, 1)
  const payload = npmProvenancePayload(environment)
  assert.equal(payload.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit, state.buildSha)
  assert.equal(payload.predicate.buildDefinition.externalParameters.workflow.ref, 'refs/heads/master')
  assert.equal(payload.predicate.buildDefinition.resolvedDependencies[0].uri, 'git+https://github.com/yann510/ss-search@refs/heads/master')
})
for (const path of [
  'README.md',
  'package-lock.json',
  'ss-search/source.js',
  'ss-search/project.json',
  'tsconfig.base.json',
  'scripts/unrelated.mjs',
  '.github/workflows/other.yml',
]) {
  test(`provenance equivalence rejects any non-allowlisted tracked difference: ${path}`, async (t) => {
    const { runtime, state } = runtimeFixture(t, { laterChange: false, changes: { [path]: 'different tracked input' } })
    await assert.rejects(releasePackage(runtime), /provenance.*tagged source/i)
    assert.equal(state.release, null)
    assert.equal(state.publishCalls, 0)
    assert.equal(state.publishedContent, null)
  })
}
test('provenance requires the genuine workflow SHA to match the initial checkout', async (t) => {
  const { runtime, state, environment } = runtimeFixture(t, { laterChange: false })
  environment.GITHUB_SHA = 'wrong-workflow-sha'
  await assert.rejects(releasePackage(runtime), /provenance.*tagged source/i)
  assert.equal(state.release, null)
  assert.equal(state.publishCalls, 0)
})
test('npm gitHead from a non-equivalent workflow source is never accepted as the tagged package', async (t) => {
  const { runtime, state, environment } = runtimeFixture(t)
  state.release = existingGithub
  state.npm = { ...existingNpm, gitHead: environment.GITHUB_SHA }
  await assert.rejects(releasePackage(runtime), /npm package identity/i)
  assert.equal(state.normalRuns, 0)
  assert.equal(state.publishCalls, 0)
})
test('array dist-tags metadata is ambiguous and stops recovery', async (t) => {
  const { runtime, state } = runtimeFixture(t, { laterChange: false })
  state.registry['dist-tags'] = []
  await assert.rejects(releasePackage(runtime), /Ambiguous registry/i)
  assert.equal(state.release, null)
  assert.equal(state.publishCalls, 0)
})
