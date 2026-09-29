# previews-worker

Serves a client repo's `preview/` folder at `<client>.<your domain>` on Cloudflare Workers. Cloudflare's Git integration redeploys it on every push that touches `preview/`, so no API tokens or GitHub secrets are involved.

## Add a client

From the client's repo:

```sh
pnpm dlx github:JacobBlana/previews-worker init acme.example.dev
```

This creates `preview/` with a starter page, `noindex` headers, `robots.txt` and the Worker's `wrangler.jsonc`, and adds `/preview export-ignore` to `.gitattributes`. Existing files are kept. `--force` rewrites the tooling files (`wrangler.jsonc`, `.assetsignore`, `_headers`, `robots.txt`) but never your HTML.

Commit and push, then in the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository**:

| Setting        | Value                          |
|----------------|--------------------------------|
| Worker name    | `preview-acme` (must match `wrangler.jsonc`) |
| Root directory | `preview`                      |
| Build command  | empty                          |
| Deploy command | `npx wrangler deploy`          |

Under **Settings → Build**, set build watch paths to include `preview/*` and turn off non-production branch builds. The first build publishes `https://acme.example.dev`.

The domain's zone must be in the same Cloudflare account. The Cloudflare GitHub app needs access to the repo; grant it once for all repos or per repo.

## Updating

`init` installs from `main` and copies the templates into the client repo, so changes here reach a client when you re-run `init <host> --force` there.
