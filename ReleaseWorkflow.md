# Release Workflow

How to cut a release once this repository is pushed to GitHub. `release.yml` does all of this automatically on tag push — this document explains what it does and how to trigger it.

## Versioning

Semantic Versioning (`vMAJOR.MINOR.PATCH`, optionally with a `-suffix` for pre-releases):

```
v0.9.0-product-complete
v1.0.0-beta
v1.0.0
```

`release.yml`'s `validate-tag` job rejects anything that doesn't match `^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$` before any build work starts. A tag with a `-suffix` is automatically marked as a pre-release on the GitHub Release.

## Cutting a release

```bash
# 1. Make sure main is green — check the CI run for the commit you're tagging.
git checkout main
git pull

# 2. Tag it.
git tag v1.0.0
git push origin v1.0.0
```

Pushing the tag triggers `release.yml`, which:

1. **`validate-tag`** — parses and validates the tag as semver, derives whether it's a pre-release.
2. **`build-and-push-images`** — builds all 4 Docker images (`ai-backend`, `backend`, `frontend`, `ai-service`) and pushes each to GitHub Container Registry as both `ghcr.io/<repo>/<app>:<version>` and `ghcr.io/<repo>/<app>:latest`.
3. **`publish-release`** — creates a GitHub Release for the tag with auto-generated release notes (commits since the last tag) plus a list of the published image references.

No manual steps are required beyond pushing the tag. There is no separate "promote to production" step in this repo yet — pulling the tagged/`:latest` images is the deployment mechanism until a CD/deploy workflow is added.

## Branch strategy this release process assumes

| Branch | Purpose |
|---|---|
| `main` | Production-ready only. Every commit here has already passed `ci.yml`. |
| `develop` | Integration branch — where feature work lands before promotion to `main`. |
| `release/*` | Cut from `develop` when stabilizing a release; bug fixes only, no new features. |
| `hotfix/*` | Cut from `main` for urgent production fixes; merged back to both `main` and `develop`. |

All four branch patterns are covered by `ci.yml`'s push trigger, so a `release/*` or `hotfix/*` branch gets the full CI pipeline before it's merged and tagged.

## Rolling back a bad release

Releases are immutable image tags — there is no in-place "undo." To roll back:

```bash
# Point the running deployment at the previous known-good tag,
# e.g. redeploy ghcr.io/<repo>/<app>:v0.9.0 instead of v1.0.0.
```

If the tag itself was wrong (e.g. pushed against the wrong commit), delete and re-push it rather than trying to edit the GitHub Release in place:

```bash
git push --delete origin v1.0.0   # confirm with whoever owns the repo first
git tag -d v1.0.0
```

## Failure policy

If any job in `release.yml` fails (invalid tag, a Docker build failure, a registry push failure), the release is **not** published — `publish-release` only runs after `build-and-push-images` succeeds for every app. No partial releases: either all four images are pushed and the GitHub Release goes out, or nothing does.
