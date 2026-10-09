# Release recovery

CI runs `node scripts/release-package.mjs` on master. Before Nx can create a
version, commit, or tag, the wrapper checks the existing GitHub token's repository
access and npm authentication. These read checks cannot guarantee publish rights;
write failures still stop the workflow. Credentials and permissions are unchanged.
Preflight also requires the genuine GitHub workflow SHA to match the initial
checkout, including when recovery is unnecessary and normal Nx versioning follows.

The wrapper reconciles the highest stable remote `ss-searchvX.Y.Z` tag first. It requires
the checkout's latest tag to equal that tag, be in the checkout's history, match its remote GitHub tag commit, and
match the top entry of the tagged project's changelog. Invalid or unrelated tags,
draft/prerelease releases, unexpected package identities, HTTP authentication or
server errors, and network failures stop the workflow. Only an explicit 404 counts
as a missing destination. This targets the latest pending release; older skipped
versions such as 1.13.2 are not backfilled.

If npm is missing, recovery requires `GITHUB_SHA` to equal the initial checkout
and proves all tracked files at that commit are identical to the tag except these
four exact recovery files: `.github/workflows/publish-package.yml`,
`scripts/release-package.mjs`, `scripts/release-package.test.mjs`, and
`scripts/RELEASE.md`. Any other difference, including source, README, dependency
lock, or build configuration, stops before building or writing either destination.
Recovery then builds a detached worktree at the **actual workflow SHA**, whose
package inputs have been proven identical to the tag. It reuses installed
dependencies only when the dependency lock matches the tagged
lock. CI's removal of root package versions for caching is ignored in this check.
Build caching/cloud execution is disabled. The generated manifest must match the
tagged source manifest before only its dist version is set to the tag version.
This is necessary because Nx versions dist while the source manifest remains
1.11.0. Recovery packs the rebuilt files, checks package identity, all exports,
and SHA-512 integrity, and publishes that exact tarball with provenance.

Automatic npm provenance uses the genuine workflow identity and source SHA. No
GitHub environment field is overridden and provenance is never disabled. The
tag is the source of the recovery version/notes; the workflow commit is the source
of the identical package inputs actually built. If equivalence cannot be proven,
a separate accurate tag-aware signed provenance mechanism is required; this
wrapper does not generate custom attestations or accept unsigned replacements.

An existing npm version is never republished. Its identity, integrity metadata,
and gitHead (when present) are checked against the tag SHA or the workflow SHA
only after the same equivalence proof; the wrapper cannot establish the contents
of a previously published package solely from this metadata. An existing GitHub
release is never rewritten. Missing GitHub releases use the tagged changelog.
The wrapper checks that the tag/checkout did not change before recovery writes.
Before any recovery write and immediately before npm publication, it rechecks
the highest remote stable tag and registry metadata. Any higher stable published
version or a newer `latest` blocks old-version publication/promotion. Ambiguous
registry metadata also stops the workflow. Branch runs use GitHub concurrency
with cancellation disabled, replacing the previous cancellation action so an
active publication is not interrupted by a newer run.
Services are not transactional: a race or failure after one destination succeeds
leaves a partial release that the next run reconciles; ambiguous write failures
stop instead of blindly retrying. Independent/manual publishers can still change
remote state between the final read and write; GitHub/npm provide no shared lock
or conditional dist-tag update in this flow. CI serialization covers this workflow's
automatic branch runs, not those independent publishers.

After recovery, the existing `nx release -y` automatic behavior runs unchanged.
The wrapper then verifies the latest tag's GitHub release and npm version even
if Nx reported a no-op. A failure prevents the later deployment step. No recovery
action creates or moves a tag, invents a new version, or publishes later source
under an older version. A changed tagged dependency lock requires manual recovery
using the tagged dependencies rather than publishing with different tooling.

Run the local regression suite with `node --test scripts/release-package.test.mjs`.
Tests use local Git fixtures, real npm packing, and stubbed network/publication
boundaries; they do not perform remote writes.
