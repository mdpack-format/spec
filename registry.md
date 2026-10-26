# Reserved names registry

Top-level package entries and manifest members share one namespace across all implementations. This
file records what is reserved, so that two applications do not claim the same name for different
things.

Adding an entry here follows the normative-change process in [GOVERNANCE.md](GOVERNANCE.md).

## Top-level package entries

| Name | Kind | Status | Defined in | Meaning |
|---|---|---|---|---|
| `mimetype` | file | Reserved | 0.1 §3.3 | Content-sniffing marker. First entry, stored uncompressed, contents `application/vnd.mdpack+zip`. |
| `mdpack.json` | file | Reserved | 0.1 §4 | The manifest. Required. |
| `document.md` | file | Reserved | 0.1 §3.4 | The entry document. Required. |
| `assets/` | directory | Reserved | 0.1 §3.5 | Resources associated with the entry document. |
| `thumbnails/` | directory | Reserved | 0.1 §3.5 | Preview images. `thumbnails/cover.png` is the conventional cover. |
| `metadata/` | directory | Reserved | 0.1 §3.5 | Structured metadata for extensions. |
| `.*` | any | Reserved | 0.1 §3.5, §3.6 | Root entries whose name begins with a dot are implementation scratch space. Not extracted, not preserved. |
| `payload.mdpe` | file | Reserved | 0.2 §3.5, §13 | The encrypted payload of a package using the encryption profile `mdpack-enc-1`. |

Any other top-level name is unclaimed. Writers may use one, and readers must both ignore it and
preserve it (§3.6) — but claiming it here first avoids collisions.

## Manifest members

| Member | Status | Defined in |
|---|---|---|
| `format` | Reserved, required | 0.1 §4.4 |
| `version` | Reserved, required | 0.1 §4.4 |
| `entrypoint` | Reserved, required | 0.1 §4.6 |
| `assets` | Reserved, required | 0.1 §4.7 |
| `id` | Reserved | 0.1 §4.4 |
| `title` | Reserved | 0.1 §4.4 |
| `description` | Reserved | 0.1 §4.4 |
| `createdAt` | Reserved | 0.1 §4.4 |
| `modifiedAt` | Reserved | 0.1 §4.4 |
| `generator` | Reserved | 0.1 §4.4 |
| `markdownDialect` | Reserved | 0.1 §4.4 |
| `documentSha256` | Reserved | 0.1 §4.4 |
| `encryption` | Reserved | 0.2 §4.4, §13 | Presence switches the package to the encryption profile `mdpack-enc-1`. |

## Asset declaration members

| Member | Status | Defined in |
|---|---|---|
| `id`, `path`, `mediaType`, `bytes`, `sha256`, `role` | Reserved, required | 0.1 §4.7 |
| `originalName` | Reserved | 0.1 §4.7, §6.7 |
| `width`, `height` | Reserved | 0.1 §4.7 |
| `description` | Reserved | 0.1 §4.7 |

## Asset roles

| Role | Status | Defined in |
|---|---|---|
| `inline` | Reserved | 0.1 §4.9 |
| `attachment` | Reserved | 0.1 §4.9 |
| `cover` | Reserved | 0.1 §4.9 |
| `source` | Reserved | 0.1 §4.9 |
| `derived` | Reserved | 0.1 §4.9 |

Unknown roles are ignored rather than rejected, so a vendor role needs no registration. Namespace
it with a reverse domain name you control, for example `com.example.watermark`.

## Vendor extensions

Vendor manifest members need no registration. Namespace them with a reverse domain name you
control (0.1 §4.10), for example:

```json
{ "com.example.preview": { "coverAssetId": "cover-image" } }
```

## Media types

| Media type | Status |
|---|---|
| `application/vnd.mdpack+zip` | Claimed; IANA vendor-tree registration pending. See 0.1 Appendix A. |
