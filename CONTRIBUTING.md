# Contributing

Thanks for helping improve Inventory App. See the [README](./README.md) for setup instructions.

## Development

```bash
cd server && npm install && npm test
cd ../client && npm install && npm run build
helm lint helm/inventory
```

The same checks run on every pull request.

## Pull requests

1. Fork the repository and branch from `main`.
2. Keep each PR focused on one change.
3. Make sure the CI checks pass.
4. Give the PR a title that follows the format below.

PRs are **squash-merged**, so the PR title becomes the commit message on `main`. Releases and their versions are decided from this title.

### PR title format

```
<type>: <short description>
```

| Type | Use for | Release |
|------|---------|---------|
| `feat` | A new feature | minor |
| `fix` | A bug fix | patch |
| `perf` | A performance improvement | patch |
| `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert` | Everything else | no release |

Add `!` after the type for a breaking change, for example `feat!: rename the DB_SSL values`. While the project is below 1.0, breaking changes bump the minor version.

Examples:

- `feat: add quantity editing for washers`
- `fix: use /healthz for backend probes`
- `docs: explain PostgreSQL SSL settings`

An optional scope is allowed, such as `fix(helm): ...`.

## Releases

Releases are automatic. Maintainers do not tag by hand.

1. When a PR titled `feat`, `fix` or `perf` is merged into `main`, the `Tag Release` workflow picks the next `vX.Y.Z` version and creates a GitHub Release with generated notes. PRs with other types do not create a release.
2. It then starts the release workflow for that tag. The release workflow builds and publishes the `inventory-server` and `inventory-client` images and the Helm chart, all with the same version.

## Security

The app has no built-in authentication. Do not expose it to the internet without a VPN or an authenticating proxy in front of it.
