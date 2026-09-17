# Conformance corpus

Packages for validating an MDPack implementation against specification 0.1.0-draft.

- `valid/` — a Conforming Reader **MUST** accept every one of these.
- `invalid/` — a Conforming Reader **MUST** reject every one of these, cleanly, reporting one of
  the error classes listed for that file.
- `expectations.json` — machine-readable expectations: for each file, a description, the acceptable
  error classes, and a note explaining what the case is actually testing.

Everything here is MIT licensed ([LICENSE-CODE](../LICENSE-CODE)). Vendor it into your test suite
freely.

## Using it

```js
import expectations from './tests/expectations.json' with { type: 'json' };

for (const testCase of expectations.valid) {
    // openPackage must succeed.
}

for (const testCase of expectations.invalid) {
    // openPackage must throw, and the reported class must be one of testCase.errors.
}
```

Some invalid cases list more than one acceptable class, because a reader can legitimately notice
the problem at different stages. `truncated-archive`, for instance, may surface either as "not an
MDPack" or as an integrity failure depending on whether the ZIP layer or the manifest layer fails
first. What is never acceptable is accepting the file, crashing, or hanging.

## Error classes

| Class | Meaning |
|---|---|
| `not-an-mdpack` | Not an MDPack package: unreadable as ZIP, no manifest, or the manifest does not identify itself as MDPack. |
| `unsupported-version` | Valid MDPack, but `version` is one the reader does not implement. Must be distinguishable from corruption. |
| `malformed-manifest` | `mdpack.json` identifies itself as MDPack but violates a structural requirement. |
| `integrity-failure` | The package contradicts itself: checksum mismatch, byte-length mismatch, duplicate entries, truncation, invalid UTF-8. |
| `security-violation` | Hostile content, such as path traversal or an encrypted entry. |
| `resource-limit` | Decompression would exceed a reader resource limit. |

## What the harder cases are for

A few files exist specifically to catch mistakes that are easy to make and hard to notice:

- **`declared-size-lie`** — the document entry declares 8 uncompressed bytes but expands to several
  kilobytes. A reader that sizes its buffers or enforces its limits from the ZIP headers reads a
  truncated document. The `documentSha256` is correct for the full text, so a conforming reader
  catches it either on the limit or on the hash.
- **`traversal-*`** — the manifest and document are perfectly valid and the hostile entry is never
  referenced. A reader that validates paths only when extracting a file it wants will accept these.
  §8.2 requires the whole package to be rejected.
- **`entrypoint-traversal`** — `entrypoint` is `../outside.md`. §4.6 pins the value to
  `document.md` precisely so that a reader never treats it as a path to resolve.
- **`duplicate-document`** and **`duplicate-asset-entry`** — legal ZIP, two entries with the same
  name, the second differing only in case. The entry a reader validates and the entry that lands on
  disk after extraction can differ. Duplicate detection has to be case-insensitive.
- **`null-assets`, `assets-not-an-array`, `missing-assets`** — JSON `null`, the wrong type, and
  absence where an array is required. The usual failure is an unhandled null-reference exception
  rather than a clean error.
- **`asset-bytes-mismatch`** — the digest is correct but the declared length is not. Readers
  routinely verify `sha256` and treat `bytes` as decoration.
- **`asset-missing-role`** — a declaration missing one of the six required members. Readers that
  model the asset object with every field optional accept this silently.
- **`compression-bomb`** — 4 MiB of zeroes at roughly 1000:1. The package itself is only a few
  kilobytes, so it is safe to keep in a repository.

And on the valid side:

- **`unknown-entries`** — carries `thumbnails/cover.png`, `metadata/extra.json`, a top-level
  `vendor-notes.txt`, a `.scratch/` entry and two `com.example.*` manifest members. Readers of any
  class must accept it; a Round-trip-preserving Writer must reproduce all of them unchanged after a
  read-modify-write cycle, except `.scratch/`, which §3.6 says must be neither extracted nor
  preserved. This is the case that catches the "ignore unknown content" bug where ignoring quietly
  means deleting.
- **`fragment-reference`** — `assets/appendix.pdf#page=3` and `assets/appendix.pdf?download=1` must
  both resolve to the same entry. A reader that matches the raw reference string reports a spurious
  missing asset.
- **`required-members-only`** — a manifest with nothing but the four required members. Readers that
  assume `id` or `title` is always present fail here.
- **`document-with-bom`** — a UTF-8 byte order mark on `document.md`. Writers should not emit one;
  readers must strip it, and must hash the bytes as stored.
- **`external-references`** — only `https:` and `mailto:` links. A reader must not fetch them and
  must not report them as missing assets.

## Regenerating

The packages are generated so that reviewers can read the intent instead of a binary diff:

```bash
node tools/build-corpus.mjs
```

Add new cases in [`tools/build-corpus.mjs`](../tools/build-corpus.mjs). Every invalid case needs a
description, the acceptable error classes, and a note saying what a reader gets wrong if it does
not handle the case.
