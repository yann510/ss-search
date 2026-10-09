# Release recovery

CI runs `node scripts/release-package.mjs` on master. Before Nx can create a
version, commit, or tag, the wrapper checks the existing GitHub token's repository
access and npm authentication. These read checks cannot guarantee publish rights;
write failures still stop the workflow. Credentials and permissions are unchanged.

The wrapper reconciles the highest stable `ss-searchvX.Y.Z` tag first. It requires
that tag to be in the checkout's history, match its remote GitHub tag commit, and
match the top entry of the tagged project's changelog. Invalid or unrelated tags,
draft/prerelease releases, unexpected package identities, HTTP authentication or
server errors, and network failures stop the workflow. Only an explicit 404 counts
as a missing destination. This targets the latest pending release; older skipped
versions such as 1.13.2 are not backfilled.

If npm is missing, recovery builds a detached local worktree at the tagged commit
with the installed dependencies only when its dependency lock matches the tagged
lock. CI's removal of root package versions for caching is ignored in this check.
Build caching/cloud execution is disabled. The generated manifest must match the
tagged source manifest before only its dist version is set to the tag version.
This is necessary because Nx versions dist while the source manifest remains
1.11.0. Recovery packs the rebuilt files, checks package identity, all exports,
and SHA-512 integrity, and publishes that exact tarball with provenance.

An existing npm version is never republished. Its identity, integrity metadata,
and gitHead (when present) are checked; the wrapper cannot establish the contents
of a previously published package solely from this metadata. An existing GitHub
release is never rewritten. Missing GitHub releases use the tagged changelog.
The wrapper checks that the tag/checkout did not change before recovery writes.
Services are not transactional: a race or failure after one destination succeeds
leaves a partial release that the next run reconciles; ambiguous write failures
stop instead of blindly retrying.

After recovery, the existing `nx release -y` automatic behavior runs unchanged.
The wrapper then verifies the latest tag's GitHub release and npm version even
if Nx reported a no-op. A failure prevents the later deployment step. No recovery
action creates or moves a tag, invents a new version, or publishes later source
under an older version. A changed tagged dependency lock requires manual recovery
using the tagged dependencies rather than publishing with different tooling.

Run the local regression suite with `node --test scripts/release-package.test.mjs`.
Tests use local Git fixtures, real npm packing, and stubbed network/publication
boundaries; they do not perform remote writes.
