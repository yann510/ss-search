import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const repository = 'yann510/ss-search'
const registry = 'https://registry.npmjs.org'
const tagPattern = /^ss-searchv(\d+\.\d+\.\d+)$/
const stablePattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const recoveryFiles = new Set([
  '.github/workflows/publish-package.yml',
  'scripts/release-package.mjs',
  'scripts/release-package.test.mjs',
  'scripts/RELEASE.md',
])

function compareVersions(left, right) {
  const a = left.split('.').map(BigInt)
  const b = right.split('.').map(BigInt)
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  return 0
}

export function matchingLocks(tagged, current) {
  const normalize = (text) => {
    const lock = JSON.parse(text)
    delete lock.version
    if (lock.packages?.['']) delete lock.packages[''].version
    return JSON.stringify(lock)
  }
  return normalize(tagged) === normalize(current)
}

function validateGithub(release, candidate) {
  if (release && (release.tag_name !== candidate.tag || release.draft !== false || release.prerelease !== false)) {
    throw new Error('Ambiguous GitHub release identity; manual review required')
  }
}

function validateNpm(pkg, candidate) {
  if (
    pkg &&
    (pkg.name !== 'ss-search' ||
      pkg.version !== candidate.version ||
      !pkg.dist?.integrity ||
      (pkg.gitHead && pkg.gitHead !== candidate.sha && pkg.gitHead !== candidate.equivalentSourceSha))
  ) {
    throw new Error('Ambiguous npm package identity; manual review required')
  }
}

export async function releasePackage(io) {
  await io.preflight()
  const candidate = await io.candidate()
  if (candidate) {
    const github = await io.github(candidate)
    const npm = await io.npm(candidate)
    validateGithub(github, candidate)
    validateNpm(npm, candidate)
    await io.assertCandidate(candidate)
    let artifact
    if (!npm) {
      await io.assertPublication(candidate)
      artifact = await io.build(candidate)
      if (artifact.name !== 'ss-search' || artifact.version !== candidate.version || !artifact.integrity) {
        throw new Error('Invalid recovery artifact identity or integrity')
      }
    }
    if (!github || !npm) await io.assertCandidate(candidate)
    if (!github) await io.createRelease(candidate)
    if (!npm) {
      await io.assertCandidate(candidate)
      await io.publish(artifact)
    }
    const verifiedGithub = await io.github(candidate)
    const verifiedNpm = await io.npm(candidate)
    validateGithub(verifiedGithub, candidate)
    validateNpm(verifiedNpm, candidate)
    if (!verifiedGithub || !verifiedNpm || (artifact && verifiedNpm.dist.integrity !== artifact.integrity)) {
      throw new Error('Partial release verification failed; stop before creating another version')
    }
  }
  await io.normal()
}

// Only an explicit 404 from a successfully authenticated/readable repository is absence.
export async function requestJson(url, { token, missing = false, method = 'GET', body, fetchImpl = fetch } = {}) {
  let response
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    })
  } catch {
    throw new Error('Release service request failed (network/timeout); no response details logged')
  }
  if (missing && response.status === 404) return null
  if (!response.ok) throw new Error(`Release service HTTP ${response.status}; verify credentials/access before retrying`)
  try {
    return await response.json()
  } catch {
    throw new Error('Invalid release service JSON response')
  }
}

export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`## ${version} (`))
  if (start !== 0) throw new Error('Latest tag does not match the top tagged changelog entry')
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  const body = lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim()
  if (!body) throw new Error('Tagged release notes are empty')
  return body
}

export function validatePack(pack, manifest, tarball) {
  const files = new Set(pack.files?.map((file) => file.path))
  const entries = [manifest.main, ...Object.values(manifest.exports['.'])].map((entry) => entry.replace(/^\.\//, ''))
  const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`
  if (
    pack.name !== 'ss-search' ||
    pack.version !== manifest.version ||
    pack.integrity !== integrity ||
    !files.has('package.json') ||
    entries.some((entry) => !files.has(entry))
  ) {
    throw new Error('Packed artifact identity, exports, or integrity mismatch')
  }
  return integrity
}

export function createRuntime(root = process.cwd(), { fetchImpl = fetch, execute = execFileSync, environment = process.env } = {}) {
  const token = environment.GITHUB_TOKEN
  const temporary = mkdtempSync(join(tmpdir(), 'ss-search-release-'))
  let worktree
  function run(command, args, cwd = root, env = {}) {
    try {
      return execute(command, args, {
        cwd,
        encoding: 'utf8',
        env: { ...environment, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 20 * 1024 * 1024,
      }).trim()
    } catch {
      // Child output may contain credentials or response bodies. Do not relay it.
      throw new Error(`${command} ${args[0]} failed; inspect the service/tool separately with secrets redacted`)
    }
  }
  const git = (...args) => run('git', args)
  const initialHead = git('rev-parse', 'HEAD')
  const github = (path, options = {}) => requestJson(`https://api.github.com/repos/${repository}${path}`, { token, fetchImpl, ...options })
  async function highestRemoteTag() {
    const refs = await github('/git/matching-refs/tags/ss-searchv')
    if (!Array.isArray(refs) || refs.some((ref) => typeof ref.ref !== 'string')) throw new Error('Invalid remote tag listing')
    let highest
    for (const ref of refs) {
      const tag = ref.ref.replace(/^refs\/tags\//, '')
      const version = tagPattern.exec(tag)?.[1]
      if (version && stablePattern.test(version) && (!highest || compareVersions(version, highest.version) > 0)) {
        highest = { tag, version }
      }
    }
    return highest
  }
  async function assertRegistry(c) {
    const pkg = await requestJson(`${registry}/ss-search`, { missing: true, fetchImpl })
    if (!pkg) return
    if (
      pkg.name !== 'ss-search' ||
      !pkg.versions ||
      typeof pkg.versions !== 'object' ||
      Array.isArray(pkg.versions) ||
      !pkg['dist-tags'] ||
      typeof pkg['dist-tags'] !== 'object' ||
      Array.isArray(pkg['dist-tags'])
    ) {
      throw new Error('Ambiguous registry version/dist-tag metadata')
    }
    const latest = pkg['dist-tags'].latest
    if (latest !== undefined && (typeof latest !== 'string' || !stablePattern.test(latest)))
      throw new Error('Ambiguous registry latest version')
    if (
      (latest && compareVersions(latest, c.version) > 0) ||
      Object.keys(pkg.versions).some((version) => stablePattern.test(version) && compareVersions(version, c.version) > 0)
    ) {
      throw new Error('Registry release superseded the recovery version; latest promotion blocked')
    }
  }
  function assertWorkflowIdentity() {
    // npm's automatic payload uses the workflow SHA, not the detached build checkout.
    if (
      environment.GITHUB_ACTIONS !== 'true' ||
      environment.GITHUB_REPOSITORY !== repository ||
      environment.GITHUB_SERVER_URL !== 'https://github.com' ||
      environment.GITHUB_SHA !== initialHead ||
      !environment.GITHUB_REF
    ) {
      throw new Error(
        'Recovery provenance cannot attest the tagged source from this workflow identity; a supported tag-aware signed provenance recovery is required',
      )
    }
  }
  function assertPublication(c) {
    assertWorkflowIdentity()
    // Build the real workflow source, but never put changed package inputs under an old version.
    const changed = git('diff', '--name-only', c.sha, initialHead, '--').split('\n').filter(Boolean)
    if (changed.some((path) => !recoveryFiles.has(path))) {
      throw new Error(
        'Recovery provenance cannot attest equivalent tagged source: tracked package/build inputs differ from the workflow commit',
      )
    }
    return initialHead
  }
  async function candidate() {
    const tags = git('tag', '--list', 'ss-searchv*', '--sort=-version:refname').split('\n').filter(Boolean)
    const highest = await highestRemoteTag()
    if (!tags.length && !highest) return null
    if (!tags.length || highest?.tag !== tags[0]) throw new Error('Checkout release tag is not the highest remote stable tag')
    const tag = tags[0]
    const match = tagPattern.exec(tag)
    if (!match || !stablePattern.test(match[1])) throw new Error('Unsupported release tag; manual review required')
    const sha = git('rev-parse', `${tag}^{commit}`)
    git('merge-base', '--is-ancestor', sha, 'HEAD')
    const remote = await github(`/git/ref/tags/${encodeURIComponent(tag)}`)
    let remoteSha = remote.object?.sha
    if (remote.object?.type === 'tag') remoteSha = (await github(`/git/tags/${remoteSha}`)).object?.sha
    if (remoteSha !== sha) throw new Error('Local and remote release tag commits differ')
    const c = { tag, version: match[1], sha, body: releaseNotes(git('show', `${tag}:ss-search/CHANGELOG.md`), match[1]) }
    try {
      c.equivalentSourceSha = assertPublication(c)
    } catch {
      // An existing package needs no new attestation; only its tagged gitHead is trusted in this case.
    }
    return c
  }
  const io = {
    async preflight() {
      if (!token || !environment.NODE_AUTH_TOKEN) throw new Error('Release credentials must be configured before versioning')
      assertWorkflowIdentity()
      const repo = await github('')
      if (repo.full_name !== repository || repo.permissions?.push !== true)
        throw new Error('GitHub token cannot write the expected repository')
      if (!run('npm', ['whoami', `--registry=${registry}`])) throw new Error('npm authentication failed')
      if (git('status', '--porcelain', '--untracked-files=no', '--', 'ss-search', 'README.md', 'nx.json'))
        throw new Error('Release inputs contain uncommitted changes')
    },
    candidate,
    assertPublication,
    async assertCandidate(c) {
      const current = await candidate()
      if (git('rev-parse', 'HEAD') !== initialHead || current?.tag !== c.tag || current.sha !== c.sha) {
        throw new Error('Release tag or checkout changed during recovery')
      }
      await assertRegistry(c)
    },
    github: (c) => github(`/releases/tags/${encodeURIComponent(c.tag)}`, { missing: true }),
    npm: (c) => requestJson(`${registry}/ss-search/${c.version}`, { missing: true, fetchImpl }),
    async build(c) {
      const buildSha = assertPublication(c)
      // Reuse installed tooling only when it is exactly the tagged dependency lock.
      if (!matchingLocks(git('show', `${c.tag}:package-lock.json`), readFileSync(join(root, 'package-lock.json'), 'utf8'))) {
        throw new Error('Tagged dependency lock differs; recover using the tagged checkout and its dependencies')
      }
      worktree = join(temporary, 'build')
      git('worktree', 'add', '--detach', worktree, buildSha)
      symlinkSync(resolve(root, 'node_modules'), join(worktree, 'node_modules'), 'dir')
      run('npx', ['nx', 'run', 'ss-search:build', '--skip-nx-cache'], worktree, { NX_DAEMON: 'false', NX_NO_CLOUD: 'true' })
      const manifestPath = join(worktree, 'dist/ss-search/package.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      const source = JSON.parse(readFileSync(join(worktree, 'ss-search/package.json'), 'utf8'))
      if (
        JSON.stringify(manifest) !== JSON.stringify(source) ||
        manifest.name !== 'ss-search' ||
        manifest.private ||
        manifest.scripts ||
        manifest.publishConfig
      ) {
        throw new Error('Built package differs from tagged manifest or contains unsupported publication settings')
      }
      // Nx versions only dist manifests; the source manifest intentionally retains 1.11.0.
      manifest.version = c.version
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
      const packs = JSON.parse(
        run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], join(worktree, 'dist/ss-search')),
      )
      if (packs.length !== 1) throw new Error('Expected exactly one recovery tarball')
      const path = join(temporary, packs[0].filename)
      const integrity = validatePack(packs[0], manifest, readFileSync(path))
      return { path, name: manifest.name, version: manifest.version, integrity, tag: c.tag, sha: c.sha, buildSha }
    },
    createRelease: (c) =>
      github('/releases', {
        method: 'POST',
        body: { tag_name: c.tag, target_commitish: c.sha, name: c.tag, body: c.body, draft: false, prerelease: false },
      }),
    async publish(artifact) {
      if (artifact.buildSha !== assertPublication(artifact))
        throw new Error('Recovery artifact source does not match truthful workflow provenance')
      await io.assertCandidate(artifact)
      return run('npm', ['publish', artifact.path, '--ignore-scripts', '--provenance', `--registry=${registry}`, '--tag=latest'])
    },
    async normal() {
      const before = await candidate()
      if (before) await io.assertCandidate(before)
      run('npx', ['nx', 'release', '-y'])
      const c = await candidate()
      if (!c) throw new Error('Nx finished without a verifiable release tag')
      const release = await io.github(c)
      const pkg = await io.npm(c)
      validateGithub(release, c)
      validateNpm(pkg, c)
      if (!release || !pkg) throw new Error('Nx finished with an incomplete release; deployment blocked')
    },
    cleanup() {
      if (worktree && existsSync(worktree)) git('worktree', 'remove', '--force', worktree)
      rmSync(temporary, { recursive: true, force: true })
    },
  }
  return io
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const runtime = createRuntime()
  try {
    await releasePackage(runtime)
    console.log('Release destinations verified')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    runtime.cleanup()
  }
}
