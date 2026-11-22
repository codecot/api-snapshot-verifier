# API Snapshot Verifier

`api-snapshot` is a command-line tool that records the responses of HTTP API endpoints as baseline snapshots, later fetches the same endpoints again and reports what changed. Each difference is classified as breaking, non-breaking or informational, and `compare` exits with code 1 when there is a breaking change, so it can fail a CI job.

The project was written in June 2025. The CLI commands described below (`init`, `capture`, `compare`, `list`, `clean`) are covered by unit tests and an end-to-end test. Other parts of the codebase are listed under [Also in the codebase](#also-in-the-codebase) without a claim about their state.

## Requirements

- Node.js 22.12 or newer. Developed and tested on Node 24; the test runner (Vitest 5) needs 22.12+.
- The CLI is built from source.

## Quick start

Build the CLI:

```sh
git clone https://github.com/codecot/api-snapshot-verifier.git
cd api-snapshot-verifier
npm ci
npm run build
```

Start a throwaway API to point it at. Any HTTP server works; this one serves a static JSON file with Python:

```sh
DEMO=$(mktemp -d)
echo '{"id": 1, "name": "Ada", "count": 5}' > "$DEMO/user.json"
python3 -m http.server 4010 --bind 127.0.0.1 --directory "$DEMO" &
```

Create `api-snapshot.config.json` in the current directory (this file name is in `.gitignore`):

```json
{
  "endpoints": [
    { "name": "user", "url": "http://127.0.0.1:4010/user.json", "method": "GET" }
  ],
  "snapshotDir": "./snapshots",
  "baselineDir": "./snapshots/baseline"
}
```

Capture a baseline, then compare against it:

```text
$ node dist/cli.js capture --baseline
📸 Captured 1 snapshot(s)
📌 Saved as baseline
$ echo $?
0

$ node dist/cli.js compare

🔍 user
  ✅ No changes detected

✅ No changes detected
$ echo $?
0
```

Change a string value. That is reported as non-breaking and the exit code stays 0:

```text
$ echo '{"id": 1, "name": "Grace", "count": 5}' > "$DEMO/user.json"
$ node dist/cli.js compare --details

🔍 user
  ⚠️  1 non-breaking change(s)
    • response.data.name: changed
      - Old: "Ada"
      + New: "Grace"
  ℹ️  1 informational change(s)
    • response.headers.content-length: changed
      - Old: "37"
      + New: "39"

⚠️  Changes detected, but no breaking changes
$ echo $?
0
```

Change a number into a string. That is a breaking change and the exit code is 1:

```text
$ echo '{"id": 1, "name": "Ada", "count": "5"}' > "$DEMO/user.json"
$ node dist/cli.js compare --details

🔍 user
  🚨 1 breaking change(s)
    • response.data.count: changed
      - Old: 5
      + New: "5"
  ℹ️  1 informational change(s)
    • response.headers.content-length: changed
      - Old: "37"
      + New: "39"

🚨 Breaking changes detected!
$ echo $?
1
```

Stop the demo server with `kill %1` and delete `$DEMO` when done.

## Commands

All commands read `./api-snapshot.config.json` unless `-c, --config <path>` is given. `node dist/cli.js <command> --help` lists every option.

| Command | What it does |
| --- | --- |
| `init [--force]` | Writes a starter `api-snapshot.config.json` with no endpoints. |
| `capture [-e <name>] [--baseline]` | Fetches every endpoint (or one with `-e`) and saves a timestamped snapshot to `snapshotDir`. With `--baseline` it also writes `<baselineDir>/<name>.json`, replacing the previous baseline. |
| `compare [-e <name>]` | Loads each baseline, fetches the endpoint again and prints the differences. The fresh response is not saved; use `capture` for that. |
| `list [-e <name>]` | Lists saved snapshots, newest first. |
| `clean [-e <name>] [-k <count>]` | Deletes all but the newest `count` snapshots per endpoint (default 10). Baselines are not touched. |

Output options of `compare`:

| Option | Effect |
| --- | --- |
| `--details` | Prints old and new values for each difference. |
| `--summary` | Prints counts per endpoint and a summary, no individual differences. |
| `--only-breaking` | Lists breaking differences only, followed by the summary. |
| `--format json` | Prints the comparison results as JSON instead of text. |
| `--save-diff <file>` | Also writes the comparison results and a summary to a JSON file. |

## Configuration

```json
{
  "endpoints": [
    {
      "name": "create-post",
      "url": "https://api.example.com/posts",
      "method": "POST",
      "headers": { "Content-Type": "application/json" },
      "body": { "title": "Test" },
      "timeout": 5000
    }
  ],
  "snapshotDir": "./snapshots",
  "baselineDir": "./snapshots/baseline",
  "rules": [
    { "path": "response.data.*.updatedAt", "ignore": true },
    { "path": "response.data.price", "severity": "breaking" }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `endpoints[].name` | yes | Used in file names and output. |
| `endpoints[].url` | yes | Full URL. |
| `endpoints[].method` | yes | HTTP method, for example `GET` or `POST`. |
| `endpoints[].headers` | no | Sent as written. `${VAR}` placeholders are **not** expanded from the environment. |
| `endpoints[].body` | no | Sent as JSON, for `POST`, `PUT` and `PATCH` only. |
| `endpoints[].timeout` | no | Milliseconds, default 30000. Exceeding it makes the capture fail. |
| `snapshotDir` | yes | Where timestamped snapshots are written. |
| `baselineDir` | no | Where baselines are written. Default: `<snapshotDir>/baseline`. |
| `rules` | no | See [Rules](#rules). |

A snapshot stores the status code, the response headers (with `authorization`, `cookie`, `set-cookie` and `x-api-key` replaced by `[REDACTED]`), the parsed body and the request duration. Non-2xx responses are recorded like any other response.

## How differences are classified

Paths look like `response.data.user.address.city` or `response.data.items[0].price`.

| Difference | Severity |
| --- | --- |
| Field removed from an object | breaking |
| Value changed type (number to string, object to array, ...) | breaking |
| Value changed from or to `null` | breaking |
| Value of an id field changed (last key is `id`, `ids`, `userId`, `user_id`, ...) | breaking |
| Status code changed from 2xx to anything outside 2xx | breaking |
| `content-type` header changed | breaking |
| Field added to an object | non-breaking |
| Any other value change of the same type | non-breaking |
| Array length changed (reported as `<path>.length`) | non-breaking |
| Status code changed from non-2xx to 2xx | non-breaking |
| Other status code change, for example 200 to 201 | informational |
| `content-length` or `cache-control` header changed | informational |

Arrays are compared index by index up to the shorter length; extra or missing elements show up only as a length change. Headers other than `content-type`, `content-length` and `cache-control` are not compared.

### Rules

Each rule has a `path` and either `"ignore": true` (drop matching differences) or a `"severity"` (`breaking`, `non-breaking` or `informational`) that overrides the classification. A rule matches a difference when the rule's path segments are a prefix of the difference path's segments, so a rule also covers everything below it. `*` matches any single segment, including an array index: `response.data.*.id` matches `response.data[3].id`. The first matching rule wins.

## Exit codes

| Situation | Exit code |
| --- | --- |
| No changes, or only non-breaking and informational changes | 0 |
| At least one breaking change (also with `--format json`) | 1 |
| Error: config not found, baseline missing, unknown endpoint, request failed | 1 |

An error and a breaking change both exit with 1; the printed message tells them apart. To use it in CI, keep the config and the baseline files in the repository and run `node dist/cli.js compare` as a job step.

## Also in the codebase

These exist in the repository. They are not covered by the tests and were not checked when this README was written.

- Web UI: a Fastify backend (`src/web/start-server.ts`; `npm run server` after a build, or `npm run web` for backend and frontend in development mode) that stores data in SQLite (`src/database/`), and a React frontend in `src/web/frontend/`. The frontend does not build at the moment: `src/web/frontend/src/api/snapshots/snapshots.api.ts` is imported but is not in the repository.
- OpenAPI and JSON Schema support: the `import-schema` and `validate-schema` commands and the `schema` field of an endpoint (`src/schema-manager.ts`).
- Change review: `compare --interactive`, `compare --auto-approve`, `history`, and `add` for adding endpoints interactively (`src/cli.ts`).
- A second CLI built on a plugin system (`src/cli-new.ts`, `src/core/`, `src/plugins/`). It is not the `api-snapshot` binary.
- Postman collection conversion (`src/utils/postman-converter.ts`).

Older, longer documentation: [HOWTO.md](HOWTO.md), [FEATURES.md](FEATURES.md), [SETUP.md](SETUP.md), [DEPLOYMENT.md](DEPLOYMENT.md), [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md).

## Development

```sh
npm ci              # also installs src/web/frontend dependencies (postinstall)
npm run typecheck
npm run lint        # 0 errors; existing warnings remain
npm test            # vitest run; tests start local HTTP servers, no internet access
npm run build
```

CI runs these steps on Node 24 (`.github/workflows/ci.yml`).

## License

MIT, see [LICENSE](LICENSE).
