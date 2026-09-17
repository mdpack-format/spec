# MDPack — Markdown Package

**Specification version:** 0.1.0-draft
**Manifest `version` value:** `0.1.0-draft`
**File extension:** `.mdpack`
**Media type:** `application/vnd.mdpack+zip`
**Status:** Draft. Implementable, but incompatible changes may land before 1.0.
**License:** [CC BY 4.0](../../LICENSE-SPEC)

---

## Abstract

MDPack (Markdown Package) is an open, portable container format that stores a Markdown document
together with the assets it references — images, PDFs, datasets, audio, video and other
attachments — in one file.

An MDPack file is an ordinary ZIP archive. Any implementation can read one with a stock ZIP
library. The Markdown stays plain UTF-8 text, assets stay byte-identical, and because assets are
referenced by ordinary relative paths, unzipping a package yields a working Markdown document and
an `assets/` directory with no rewriting at all.

MDPack 0.1 defines a **single-document package**: one entry document plus its assets.

---

## 1. Conventions

### 1.1 Requirement keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**,
**SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY** and **OPTIONAL** in this document
are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14)
([RFC 2119](https://www.rfc-editor.org/info/rfc2119),
[RFC 8174](https://www.rfc-editor.org/info/rfc8174)) when, and only when, they appear in all
capitals.

### 1.2 Normative and non-normative content

Sections 2 through 12 are normative. Appendices are non-normative unless stated otherwise.
Examples, rationale and "Note:" paragraphs are non-normative.

### 1.3 Terminology

- **Package** — the `.mdpack` file itself.
- **Manifest** — the `mdpack.json` entry at the package root.
- **Entry document** — the primary Markdown entry, `document.md`.
- **Asset** — a resource stored in the package, normally under `assets/`.
- **Reader** — software that opens, renders, validates or extracts a package.
- **Writer** — software that produces a package.
- **Entry** — a member of the ZIP archive, identified by its path.

### 1.4 Status of this draft

This is a draft. Implementations **MAY** support it, but **SHOULD** identify their support as
draft-level. Draft releases before 1.0 **MAY** make incompatible changes.

---

## 2. Goals and non-goals

### 2.1 Goals

- One portable file per self-contained document.
- Markdown remains plain, human-readable UTF-8 text; it is never Base64-encoded or wrapped.
- Assets are stored as-is, byte for byte.
- References use ordinary relative Markdown paths, so a package unzips into a directory that
  already works in Obsidian, VS Code, GitHub and Pandoc.
- Images are the primary use case; other asset types are first-class but optional to render.
- Structure and asset integrity are machine-verifiable.
- Trivial to implement on top of any ZIP and JSON library.
- No vendor lock-in; independent implementations are expected.

### 2.2 Non-goals for 0.1

- A Markdown syntax or rendering standard.
- Multi-document collections, books, websites or projects.
- Executable content, macros or scripts of any kind.
- Encryption, digital signatures, revision history or synchronisation.
- A guarantee that every reader can render every asset type.

These **MAY** be addressed by later versions or by optional extension profiles.

---

## 3. Container

### 3.1 ZIP requirements

An MDPack package **MUST** be a ZIP archive conforming to the
[PKWARE APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) `.ZIP` File Format
Specification.

- Writers **MUST** use either Deflate or Store for every entry. Writers **MUST NOT** use any
  other compression method.
- Readers **MUST** support Deflate and Store. Readers **MAY** reject any other method.
- Writers **MUST NOT** produce encrypted entries. Readers **MUST** reject a package containing
  any encrypted entry.
- Entry paths **MUST** use `/` as the separator. Writers **MUST NOT** emit `\`.
- Entry paths **MUST** be encoded as UTF-8. Writers **SHOULD** set general purpose bit 11 (the
  language encoding flag) when an entry path contains non-ASCII characters.
- Text entries (`mdpack.json`, `document.md`) **MUST** be UTF-8. Writers **SHOULD NOT** emit a
  byte order mark; readers **MUST** accept one on `document.md` and strip it.
- Writers **MAY** produce ZIP64 packages. Readers **SHOULD** support ZIP64.

### 3.2 Layout

```text
architecture.mdpack
├── mimetype              (first entry, stored uncompressed)
├── mdpack.json           (manifest)
├── document.md           (the entry document)
└── assets/
    ├── container-diagram.png
    ├── appendix.pdf
    └── source-data.csv
```

### 3.3 The `mimetype` entry

The first entry of the archive **SHOULD** be named `mimetype` and **SHOULD** contain exactly the
26 ASCII bytes `application/vnd.mdpack+zip`, with no trailing newline.

When present, this entry:

- **MUST** be the first entry in the archive;
- **MUST** be stored with compression method Store (no compression);
- **MUST NOT** have an extra field.

This places the literal string `application/vnd.mdpack+zip` at a fixed byte offset (38) in every
package, letting content sniffers and `file(1)` identify an MDPack without decompressing
anything. EPUB and OpenDocument use the same technique.

Writers **SHOULD** emit this entry. Readers **MUST NOT** require it: a package's type is
ultimately determined by `mdpack.json`, and packages produced by minimal writers remain valid. A
reader that finds a `mimetype` entry whose content is not `application/vnd.mdpack+zip` **MUST**
reject the package.

### 3.4 Required entries

| Path | Requirement | Purpose |
|---|---|---|
| `mdpack.json` | **MUST** be present | Manifest: identity, metadata, asset declarations |
| `document.md` | **MUST** be present | The entry document |

Both **MUST** be at the archive root. The package **MUST** contain exactly one of each.

### 3.5 Optional and reserved entries

| Path prefix | Status |
|---|---|
| `assets/` | Reserved. Resources associated with the entry document. |
| `thumbnails/` | Reserved. Preview images; `thumbnails/cover.png` is the conventional cover. |
| `metadata/` | Reserved. Structured metadata for extensions. |
| root names beginning with `.` | Reserved for implementation scratch space. |

The `assets/` directory **MAY** be empty. Because ZIP archives do not reliably preserve empty
directories, readers **MUST** accept a package that has no `assets/` directory entry when the
package declares no assets.

New reserved top-level names are tracked in the
[reserved names registry](../../registry.md).

### 3.6 Unknown entries

Readers **MUST** ignore entries they do not understand rather than rejecting the package.

Writers that rewrite an existing package (read-modify-write) **MUST** preserve unknown entries
byte for byte. This is what makes third-party extensions viable: an application that knows
nothing about `thumbnails/` must not destroy another application's thumbnails when the user edits
the text.

The single exception is the reserved dot-prefixed root namespace of §3.5. Those entries are
implementation scratch space: readers **MUST NOT** extract them and writers **MUST NOT** preserve
or emit another implementation's.

Note: preservation is required only for entries the writer actually read from a source package. A
writer creating a package from scratch has nothing to preserve.

---

## 4. The manifest `mdpack.json`

### 4.1 Encoding and shape

`mdpack.json` **MUST** be a JSON document as defined by
[RFC 8259](https://www.rfc-editor.org/info/rfc8259), encoded in UTF-8 without a byte order mark.
Its root **MUST** be an object.

Readers **MUST** ignore unknown members at every level. Readers **MUST NOT** fail because a member
they do not recognise is present.

A [JSON Schema](../../schema/mdpack-manifest-0.1.schema.json) is published alongside this
document. The schema is a convenience for tooling; where the two disagree, this document governs.

### 4.2 Minimal example

```json
{
  "format": "mdpack",
  "version": "0.1.0-draft",
  "entrypoint": "document.md",
  "assets": []
}
```

### 4.3 Full example

```json
{
  "format": "mdpack",
  "version": "0.1.0-draft",
  "id": "01J8FZ2SK6NHQ6WHFMCRP7YMVG",
  "title": "MDPack architecture overview",
  "description": "How the container is laid out and why.",
  "createdAt": "2026-09-17T07:00:00Z",
  "modifiedAt": "2026-09-17T07:10:00Z",
  "generator": {
    "name": "MD Vault",
    "version": "1.0.0"
  },
  "markdownDialect": "commonmark",
  "entrypoint": "document.md",
  "documentSha256": "b3f4c6d5b0b6329d2ae47d08a1c4e7f2094e6d1a8b3c5f7092d4e6a8b0c2d4e6",
  "assets": [
    {
      "id": "01J8FZ3Y8C4Q2X6J9P5A7B1D3E",
      "path": "assets/container-diagram.png",
      "mediaType": "image/png",
      "bytes": 184392,
      "sha256": "a59b9c4581e6c7d66aeafc97eeb8f20e76f678c2208c94bf70c4a25df6d1c258",
      "role": "inline",
      "originalName": "container diagram (final).png",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

### 4.4 Root members

| Member | Type | Writer | Reader | Notes |
|---|---|---|---|---|
| `format` | string | **MUST** emit | **MUST** reject if absent or `!= "mdpack"` | Exact, case-sensitive |
| `version` | string | **MUST** emit | **MUST** reject if absent; see §4.5 | `"0.1.0-draft"` for this version |
| `entrypoint` | string | **MUST** emit | **MUST** reject if absent, empty or `!= "document.md"` | See §4.6 |
| `assets` | array | **MUST** emit | **MUST** reject if absent or `null`; **MAY** be empty | See §4.7 |
| `id` | string | **SHOULD** emit | **MAY** synthesise one if absent | See §5 |
| `title` | string | **SHOULD** emit | **SHOULD** fall back to the file name without `.mdpack` | Display name |
| `description` | string | **MAY** emit | informational | Short summary |
| `createdAt` | string | **SHOULD** emit | **MAY** fall back to the file's creation time | RFC 3339, see §4.8 |
| `modifiedAt` | string | **SHOULD** emit | **MAY** fall back to the file's modification time | RFC 3339, see §4.8 |
| `generator` | object | **SHOULD** emit | ignore | `{ "name", "version" }`, diagnostics only |
| `markdownDialect` | string | **MAY** emit | **MAY** use as a rendering hint | e.g. `commonmark`, `gfm` |
| `documentSha256` | string | **SHOULD** emit | **MUST** verify when present | See §7 |

`format` is compared case-sensitively so that an unrelated ZIP that happens to contain a
`mdpack.json` cannot be mistaken for a package.

Note: `documentSha256` is not in the 0.1.0 draft originally circulated. It was added because
without it the entry document — the one file every package is guaranteed to have — was the only
content with no integrity protection at all. It is optional, so packages written before it existed
remain conforming.

### 4.5 Version handling

`version` is the version of *this specification* that the package was written against. It is a
string so that it can carry pre-release qualifiers such as `-draft`.

- A reader **MUST** reject a package whose `version` it does not implement, and **SHOULD** report
  this distinctly from "corrupt file" so the user is told to upgrade rather than told their data
  is broken.
- A reader **MAY** accept versions that differ only in the patch component.
- After 1.0, a reader encountering an unknown major version **MUST NOT** claim conformance; it
  **MAY** offer best-effort inspection or extraction when doing so is safe.

### 4.6 `entrypoint`

In this version `entrypoint` **MUST** be the exact string `document.md`. The member exists so a
future version can relocate or rename the entry document without a flag day.

A reader **MUST NOT** treat `entrypoint` as an arbitrary path in 0.1. In particular it **MUST NOT**
follow a value such as `../outside.md`.

### 4.7 Asset objects

| Member | Type | Writer | Reader |
|---|---|---|---|
| `id` | string | **MUST** emit | **MUST** reject if absent, empty or duplicated |
| `path` | string | **MUST** emit | **MUST** reject if absent, empty, unsafe (§8.2) or not under `assets/` |
| `mediaType` | string | **MUST** emit | **MUST NOT** trust for rendering; see §8.5 |
| `bytes` | integer | **MUST** emit | **MUST** verify against the decompressed length |
| `sha256` | string | **MUST** emit | **MUST** verify; see §7 |
| `role` | string | **MUST** emit | **MUST** ignore unknown values; see §4.9 |
| `originalName` | string | **SHOULD** emit when the stored name was altered | Display and export |
| `width`, `height` | integer | **SHOULD** emit for raster images | informational |
| `description` | string | **MAY** emit | Alternative text or caption hint |

Every asset listed in `assets` **MUST** have a corresponding entry in the package. A reader
**MUST** reject a package in which a declared asset has no matching entry, because the document
would otherwise render with silently broken images.

Files under `assets/` that are *not* declared are permitted. Readers **MUST NOT** reject them.
They are reported as **untracked** (§9.3). A reader **MUST NOT** assume an undeclared file is
safe, verified or part of the document, and a strict validator **SHOULD** report it.

`id` uniqueness is scoped to the `assets` array. Two assets **MUST NOT** share an `id`, and two
assets **MUST NOT** share a `path`.

### 4.8 Timestamps

`createdAt` and `modifiedAt` **MUST** be [RFC 3339](https://www.rfc-editor.org/info/rfc3339)
date-time strings in UTC.

- Writers **MUST** use the `Z` suffix. Writers **MUST NOT** emit a numeric offset such as `+00:00`.
- Writers **SHOULD** emit either whole seconds or exactly three fractional digits.
- Readers **SHOULD** accept any valid RFC 3339 string and convert it to UTC.

Example: `2026-09-17T07:10:00Z` or `2026-09-17T07:10:00.500Z`.

### 4.9 Asset roles

| Role | Meaning |
|---|---|
| `inline` | Intended to appear within rendered document content |
| `attachment` | Intended to be linked, opened or downloaded |
| `cover` | Intended as a package cover or preview image |
| `source` | Source material used to produce another asset or the document |
| `derived` | Generated resource, such as a thumbnail or an OCR result |

A reader **MUST** treat `role` as descriptive metadata, never as authorisation to render or
execute content. Readers **MUST** ignore unknown role values and **MUST NOT** reject a package
because of one. Writers **SHOULD** use a role from this table.

At most one asset **SHOULD** carry the `cover` role. A reader encountering several **SHOULD** use
the first in document order.

### 4.10 Extension members

Applications **MAY** add members this specification does not define. Such members **MUST** be
namespaced with a reverse domain name that the author controls:

```json
{
  "com.example.preview": {
    "coverAssetId": "cover-image"
  }
}
```

Writers performing a read-modify-write **MUST** preserve unknown members, including members they
did not write, at every level of the manifest. Round-tripping a package **MUST NOT** silently
discard another application's metadata.

---

## 5. Identifiers

The package and every declared asset carry a stable identifier.

An identifier **MUST** match the following production:

```abnf
id = 1*64( ALPHA / DIGIT / "-" / "_" / "." )
```

That is: 1 to 64 characters, each an ASCII letter, ASCII digit, hyphen, underscore or dot.

Identifiers **MUST** be unique within their package. Identifiers **SHOULD** be generated by a
method with negligible collision probability. Any of the following are **RECOMMENDED**:

- [ULID](https://github.com/ulid/spec), for example `01J8FZ2SK6NHQ6WHFMCRP7YMVG`
- UUID v4 or v7, with or without hyphens
- 16 or more bytes from a cryptographically secure random source, hex- or base32-encoded

Human-readable slugs such as `architecture-diagram` are permitted and are useful in
hand-authored packages, but a writer generating identifiers automatically **SHOULD** use one of
the collision-resistant forms above.

Identifiers are opaque. A reader **MUST NOT** parse an identifier to extract a timestamp, ordering
or any other meaning, even when the generator embeds one.

---

## 6. Referencing assets from Markdown

### 6.1 Relative paths

MDPack uses ordinary relative Markdown references. There is no custom URI scheme.

```md
![Container structure](assets/container-diagram.png)

[Read the appendix](assets/appendix.pdf)

[Download the source data](assets/source-data.csv)
```

A relative reference is resolved against the directory containing the entry document. Since
`document.md` sits at the package root, `assets/example.png` resolves to the archive entry
`assets/example.png`.

This is the whole point of the design: the same text works unchanged whether the document is
inside a package or sitting in an unzipped folder. Export and import require no link rewriting.

### 6.2 Resolution algorithm

A reader resolving a Markdown reference against package content **MUST** perform exactly these
steps, in order:

1. If the reference has a scheme (`https:`, `mailto:`, `data:` and so on), it is not a package
   reference. Stop; see §6.4.
2. If the reference begins with `/` or `\`, or contains a drive-letter prefix such as `C:`, fail.
   It is not a valid package reference.
3. Split off the query (`?`) and fragment (`#`) components and set them aside (§6.5).
4. Percent-decode the remaining path exactly once.
5. Normalise `\` to `/` and collapse empty segments.
6. Drop every `.` segment. It resolves to the current directory and changes nothing, so
   `./assets/diagram.png` and `assets/diagram.png` **MUST** name the same entry.
7. If any segment is `..`, fail. A reference **MUST NOT** escape the package root. A reader
   **MUST NOT** resolve `..` against a parent segment first, because a path that leaves the package
   and comes back is still a path that left the package.
8. If any segment contains a control character (U+0000–U+001F, U+007F), fail.
9. Look up the resulting path among the package entries. Comparison **SHOULD** be case-sensitive,
   matching ZIP semantics.

Step 7 operates on the decoded path, so `..%2f..%2fetc%2fpasswd` is rejected: after decoding, the
segments are `..`, `..`, `etc`, `passwd`, and the first `..` fails the check.

A reader **MUST NOT** resolve a package reference against the host file system, the network, or
any other package. A reference that does not match a package entry is a **missing asset**, not an
invitation to look elsewhere.

### 6.3 Declared and undeclared references

A conforming writer **SHOULD** ensure that every reference from `document.md` to a path under
`assets/` has a matching declaration in `mdpack.json`.

Readers **SHOULD** report a reference that resolves to no package entry as a missing asset. A
reader **MAY** render a resolvable but undeclared asset, but **SHOULD** mark it as unverified.

### 6.4 External references

`http:` and `https:` URLs remain external references and are not part of the package.

- A writer **MUST NOT** silently download and embed an external resource.
- A reader **MUST NOT** fetch external content automatically, and in particular **MUST NOT** fetch
  anything merely to validate a package.
- A reader that offers external loading **SHOULD** put it under user control and **SHOULD** make
  the destination visible.
- Writers **MUST NOT** generate `file:` URLs or absolute local paths when inserting an asset.
- Readers **MUST NOT** grant a rendered document arbitrary access to the local file system. A
  document from a package is untrusted input.

### 6.5 Query and fragment components

A reference **MAY** carry a fragment, and **MAY** carry a query:

```md
[Section 3](assets/appendix.pdf#page=3)
```

For the purpose of locating the entry, a reader **MUST** strip the query and fragment before
matching, as specified in step 3 of §6.2. The reader **MAY** then pass them to whatever component
renders the asset.

### 6.6 Why not data URIs

`data:image/png;base64,…` is **NOT RECOMMENDED** for content stored in a package. It inflates the
Markdown by roughly one third, destroys readability and line-based diffs, and turns replacing a
single image into a whole-document edit. Readers **MAY** render data URIs a user typed; writers
**MUST NOT** produce them when inserting an asset.

### 6.7 Asset file naming

Because the reference *is* the file name, asset names are user-visible and **SHOULD** stay
recognisable. A writer adding a file to `assets/` **MUST** derive the stored name as follows:

1. Take the source file's base name.
2. Replace every character that is a control character, a path separator (`/`, `\`), or one of
   `<>:"|?*` with `-`.
3. Trim leading and trailing whitespace and dots.
4. If the result is empty, or is a reserved device name on the host platform (`CON`, `PRN`, `AUX`,
   `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, compared case-insensitively and ignoring the extension),
   substitute the asset's identifier.
5. Truncate so the whole entry path fits the reader path-length limit of §8.3, preserving the
   extension.
6. If an entry with that path already exists in the package, append `-2`, `-3`, … before the
   extension until the path is unique. Comparison **MUST** be case-insensitive so that packages
   round-trip safely through case-insensitive file systems.

When the stored name differs from the source name, the writer **SHOULD** record the source name
in `originalName`.

A writer **MAY** instead name assets after their identifiers (`assets/<id>.<ext>`). This is a
conforming choice and avoids collisions entirely, at the cost of unreadable links.

---

## 7. Integrity

There is no "strict mode". Verification is governed by a single rule:

> If a checksum is present, a reader **MUST** verify it before using the corresponding content,
> and **MUST** treat a mismatch as a corrupt package.

Concretely:

- Every `sha256` member **MUST** be the SHA-256 digest of the raw, uncompressed bytes of the
  corresponding entry, encoded as exactly 64 lowercase hexadecimal characters. Readers **MUST**
  compare case-insensitively.
- `documentSha256` covers the UTF-8 bytes of `document.md` as stored, including a byte order mark
  if one is present.
- Writers **MUST** emit `sha256` and `bytes` for every declared asset (§4.7) and **SHOULD** emit
  `documentSha256`.
- Readers **MUST** verify the document checksum, when present, before presenting the text.
- Readers **MUST** verify an asset's checksum before presenting that asset. A reader that extracts
  the package to a working directory **MUST** verify each entry as it extracts.
- Readers **MUST** compute digests from the bytes they actually decompressed, never from a length
  or digest declared in the ZIP headers.
- A reader **MAY** still let the user extract or inspect content that failed verification, but
  **MUST** make the failure visible and **MUST NOT** represent that content as verified.

A writer that rewrites a package **MUST** recompute every checksum it emits, and **SHOULD** verify
the freshly written package before it replaces the original (§9.2).

### 7.1 Integrity is not authenticity

SHA-256 detects accidental modification and corruption within a package. It says nothing about who
produced the package. MDPack 0.1 defines no signatures, and an implementation **MUST NOT** present
a matching digest as evidence of authorship or safety.

---

## 8. Security

A package is untrusted input. Every requirement in this section is normative for readers.

### 8.1 Open read-only

A reader **MUST** open the archive read-only. A reader **MUST NOT** modify a package in place; see
§9.2.

### 8.2 Path traversal

Before an entry path is used for anything — extraction, lookup or display — the reader **MUST**
normalise and validate it:

- Replace `\` with `/` and collapse empty segments.
- Reject the package if any entry path is absolute (begins with `/` or `\`), contains a drive
  letter or any `:`, is a UNC path, or contains a `.` or `..` segment.
- Reject the package if any segment contains a character that is invalid in a file name on the
  host platform.

An unsafe path **MUST** invalidate the whole package, not merely the offending entry. A package
that attempts traversal is hostile; the rest of its contents cannot be trusted either.

When extracting, the reader **MUST** additionally verify that each resolved destination path lies
inside the target directory after symlink and `..` resolution. Validating the entry name alone is
not sufficient.

### 8.3 Resource limits

A reader **MUST** enforce an upper bound on each of the following. The values are **RECOMMENDED**
defaults; implementations **MAY** expose them as configuration.

| Limit | Recommended default |
|---|---|
| Number of entries | 10 000 |
| Uncompressed size of one entry | 256 MiB |
| Total uncompressed size | 1 GiB |
| Compression ratio of one entry | 200:1 |
| Entry path length | 1 024 bytes |

Critically, the reader **MUST** count bytes as they are actually decompressed and abort the moment
a limit is exceeded. The uncompressed sizes recorded in the ZIP local header and central directory
are attacker-controlled: a malicious Deflate stream can declare 8 bytes and produce 8 gigabytes. A
reader that trusts the declared size has no limit at all.

A reader that refuses a package because of a configured limit **SHOULD** say that the package
exceeds a safety limit, rather than claiming it is structurally invalid.

### 8.4 Duplicate entries

ZIP permits two entries with the same path. A reader **MUST** reject a package containing
duplicates after path normalisation and case-insensitive comparison.

Without this rule the entry a reader validates and the entry that ends up on disk can differ:
extraction overwrites, so the last entry wins, while validation may have inspected the first.

### 8.5 Content type confusion

A reader **MUST NOT** trust the manifest's `mediaType`, or the file extension, when deciding how
to render an asset. It **SHOULD** verify the declared type against the content's magic bytes and
refuse the asset on mismatch.

Writers **SHOULD** determine `mediaType` from file content or reliable source metadata rather than
from the extension alone.

### 8.6 Executable and active content

A reader **MUST NOT** automatically execute, install, open or launch bundled content. This covers,
without limitation: executables and application bundles, shell scripts and batch files, office
macros, JavaScript and other scripts, HTML with active content, embedded SVG scripts or event
handlers, and PDF actions that launch external applications.

Opening an asset in another application **MUST** require an explicit user action.

### 8.7 SVG

SVG is a script-bearing format. A reader that renders `image/svg+xml` assets **MUST** do one of
the following:

- render the SVG in a non-scripting context — an HTML `<img>` element or a CSS `background-image`,
  where user agents do not execute embedded script; or
- sanitise the SVG, removing `<script>`, event-handler attributes, `<foreignObject>` and external
  references, before rendering it in any context that can execute script.

Readers **MUST NOT** render SVG assets by inlining them into the host document without
sanitisation. A reader **MAY** instead present SVG as an attachment.

### 8.8 Text decoding

A reader **MUST** decode `mdpack.json` and `document.md` as strict UTF-8 and **MUST** treat
invalid byte sequences as corruption. Silent replacement with U+FFFD turns a detectable error into
permanent data damage on the next save.

### 8.9 Error reporting

A reader **MUST** fail cleanly on a corrupt, unsupported or unsafe package: a specific, actionable
message and no crash. The failure modes **SHOULD** be distinguishable by the calling application,
at minimum: not an MDPack, unsupported version, malformed manifest, integrity failure, security
violation, safety limit exceeded.

---

## 9. Package lifecycle

### 9.1 Opening

A conforming reader opens a package by:

1. Opening the ZIP read-only.
2. Validating every entry path (§8.2) and rejecting duplicates (§8.4).
3. Verifying `mimetype` if present (§3.3).
4. Locating and parsing `mdpack.json`; validating `format`, `version`, `entrypoint` and `assets`
   (§4.4).
5. Locating `document.md`.
6. Confirming that every declared asset has a matching entry (§4.7).
7. Verifying checksums as content is read (§7).

A reader **MAY** extract the package to a working directory and operate on plain files. If it
does, the working directory **MUST** be outside any location the user browses as a library, and
extraction **MUST** apply §8.2 and §8.3.

### 9.2 Saving

A writer **MUST NOT** rewrite a package in place. A crash or power loss midway through an in-place
rewrite destroys the document and every asset in it.

A writer **MUST**:

1. Build the new package in a temporary file, in the same directory as the target so the final
   step stays on one volume.
2. Reopen and verify the temporary package: required entries present, manifest parses, every
   declared asset present, every checksum matching.
3. Flush the temporary file to durable storage.
4. Atomically replace the target with the temporary file.

A writer **SHOULD** give the temporary file a unique name so two concurrent saves cannot collide,
and **SHOULD** remove any transient backup it created once the replace succeeds.

A writer **SHOULD** detect concurrent external modification — by comparing the target's
modification time or content digest against the value observed when the package was opened — and
**MUST NOT** silently overwrite another writer's changes.

### 9.3 Asset cleanup

An application offering to remove unused assets **MUST** classify each one before deleting
anything:

- **used** — referenced from the entry document;
- **unused** — declared in the manifest, referenced nowhere;
- **missing** — referenced by the document, absent from the package;
- **untracked** — present under `assets/`, absent from the manifest.

Deletion **MUST** require explicit user confirmation, and the application **MUST** present the
candidate list first. An implementation **MUST NOT** delete unused or untracked assets
automatically as a side effect of saving: an extension or a future feature may hold the only
reference.

---

## 10. Validation levels

An implementation **MAY** expose more than one validation mode. A validator **SHOULD** distinguish
errors from warnings: a missing `document.md` is an error, an unused declared asset is a warning.

### 10.1 Structural validation

ZIP readability; required root entries; valid JSON manifest; required manifest members; correct
`format`, `version` and `entrypoint`; safe, unique archive paths; well-formed asset declarations;
each declaration pointing at an existing entry.

### 10.2 Integrity validation

Structural validation, plus asset byte lengths, asset digests and `documentSha256`.

### 10.3 Reference validation

Integrity validation, plus, where feasible: references from `document.md` to `assets/` paths;
missing referenced assets; referenced assets lacking declarations; declared assets the document
never references.

---

## 11. Rendering and interoperability

### 11.1 Markdown dialects

MDPack specifies packaging, not rendering. A reader **SHOULD** render the document with its normal
Markdown implementation. If `markdownDialect` is present a reader **MAY** use it as a hint; a
reader that does not support the declared dialect **SHOULD** still attempt a safe best-effort
rendering or present the source.

### 11.2 Image support

A conforming reader **SHOULD** render these media types when referenced through standard Markdown
image syntax:

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/gif`

Support for `image/avif`, `image/svg+xml` (subject to §8.7) and anything else is **OPTIONAL**.

### 11.3 Non-image assets

A reader is **NOT REQUIRED** to render every asset type. For unsupported types a reader **SHOULD**
provide a safe way to inspect, save, export or open the file through an explicit user action — a
PDF offered as a download, an MP3 offered to a player only if the application supports audio.

---

## 12. Conformance

An implementation claims conformance against one or more of the following classes.

### 12.1 Conforming Reader

**MUST** satisfy every reader requirement in §3 through §9, and **MUST** produce the expected
outcome for every file in the [conformance corpus](../../tests/).

### 12.2 Conforming Writer

**MUST** satisfy every writer requirement in §3 through §9, and **MUST** produce packages that a
Conforming Reader accepts. In particular it **MUST** emit `bytes` and `sha256` for every declared
asset (§7), **MUST** save atomically (§9.2) and **MUST** emit RFC 3339 `Z` timestamps (§4.8).

### 12.3 Round-trip-preserving Writer

A Conforming Writer that additionally satisfies §3.6 and §4.10: unknown entries and unknown
manifest members survive a read-modify-write cycle unchanged.

An application that edits packages produced by other tools **SHOULD** claim this class. An
application that only creates packages need not.

### 12.4 Conformance summary

A file conforms to MDPack 0.1.0-draft when it is a ZIP archive that:

1. Uses the `.mdpack` extension.
2. Contains root-level `mdpack.json` and `document.md`.
3. Has a manifest with `format: "mdpack"`, `version: "0.1.0-draft"`, `entrypoint: "document.md"`
   and an `assets` array.
4. Uses only safe, relative, non-duplicated archive paths.
5. Stores declared assets under `assets/`.
6. Gives each declared asset a unique identifier and a valid path, media type, byte count,
   SHA-256 digest and role.
7. Requires no reader to execute bundled content or fetch remote content automatically.

---

## Appendix A: Media type registration

```text
Type name:               application
Subtype name:            vnd.mdpack+zip
Required parameters:     none
Optional parameters:     none
Encoding considerations: binary
Security considerations: See §8 of this specification, and the security considerations
                         of application/zip (RFC 6839).
Interoperability:        An MDPack package is a ZIP archive and can be opened by any ZIP
                         tool. Packages whose first entry is the uncompressed "mimetype"
                         entry can be identified by content sniffing.
Published specification: https://mdpack-format.github.io/spec/
Applications:            Markdown note-taking and documentation tools.
Fragment identifier:     None defined. See RFC 6839 for the +zip suffix.
Magic number(s):         50 4B 03 04 at offset 0;
                         "mimetypeapplication/vnd.mdpack+zip" at offset 30.
File extension(s):       .mdpack
Macintosh file type:     none
```

## Appendix B: Export and import

A package maps onto a plain Markdown file plus an assets directory with no link rewriting at all.
That mapping is what keeps the format non-captive.

### B.1 Export

```text
architecture.mdpack         →    architecture/
                                 ├── document.md
                                 └── assets/
                                     ├── container-diagram.png
                                     ├── appendix.pdf
                                     └── source-data.csv
```

Because references are already relative, the exported `document.md` renders correctly in Obsidian,
VS Code, GitHub and Pandoc as-is. An exporter **SHOULD** preserve the relative paths exactly and
**MUST NOT** rewrite them. It **MAY** also write `mdpack.json` alongside, to preserve metadata.

An exporter **MAY** rename `document.md` to match the package name. If it does, it **MUST** leave
the asset paths untouched, since they are relative to the containing directory rather than to the
file name.

### B.2 Import

```text
Note/                       →    Note.mdpack
├── Note.md
└── images/*.png
```

The importer reads the Markdown, resolves relative references to local files, copies each into
`assets/` under a name derived per §6.7, rewrites those references to the new `assets/…` paths, and
writes `mdpack.json`.

An importer **SHOULD**:

- preserve the source text unchanged except where a reference must be rewritten;
- leave external URLs alone;
- report unresolved references and assets it could not locate, rather than failing the whole
  import or silently dropping them.

An importer **MUST NOT** delete or modify the source files.

## Appendix C: Git and version control

A `.mdpack` file is a ZIP container, so Git treats it as binary: no line diffs, no automatic
merges, and every save stores a new blob.

MDPack is therefore the better choice for portability, single-file sync, sharing and archival,
while plain Markdown directories remain the better choice for Git-managed content. A tool that
supports both **SHOULD** let the user choose per library rather than imposing one, and **MUST**
keep export (Appendix B) available so the choice is reversible.

## Appendix D: Minimal package

```text
empty-note.mdpack
├── mdpack.json
└── document.md
```

`mdpack.json`:

```json
{
  "format": "mdpack",
  "version": "0.1.0-draft",
  "entrypoint": "document.md",
  "assets": []
}
```

`document.md`:

```md
# Empty note

This is a minimal MDPack package.
```

## Appendix E: Changes from the 0.1.0 draft circulated on 2026-09-17

The circulated draft established the name, the container layout, the manifest shape and the
relative-path reference model. All of that is unchanged. This revision adds the normative detail an
independent implementer would otherwise have to invent:

- **Deliverables moved out of "future work".** A JSON Schema for `mdpack.json` and a
  machine-readable conformance corpus are published with this document rather than deferred.
- **ZIP-level requirements** were added: permitted compression methods, the prohibition on
  encrypted entries, UTF-8 entry paths, ZIP64, and byte order mark handling.
- **The `mimetype` first entry** (§3.3) was introduced for content sniffing, mirroring EPUB.
- **Concrete resource limits** (§8.3) replaced the draft's "SHOULD enforce configurable limits",
  and readers must now count bytes as decompressed rather than trusting declared sizes.
- **Duplicate entry rejection** (§8.4) became normative for all paths, not just the two required
  entries.
- **Strict UTF-8 decoding** (§8.8) became normative; U+FFFD substitution is prohibited.
- **A step-ordered reference resolution algorithm** (§6.2) was specified, including where query and
  fragment stripping happens relative to percent-decoding.
- **Asset file naming** (§6.7) was specified. Because references are relative paths, the stored
  name is user-visible, and collision handling had to be pinned down for packages to round-trip
  through case-insensitive file systems.
- **`documentSha256`** (§4.4) was added as a recommended member, closing the gap where the entry
  document had no integrity protection.
- **Unknown entry and unknown member preservation** (§3.6, §4.10) was raised from SHOULD to MUST
  for writers that rewrite an existing package, and a reserved dot-prefixed root namespace was
  carved out for implementation scratch space.
- **An identifier production** (§5) was defined, along with the rule that identifiers are opaque.
- **Timestamps** were pinned to RFC 3339 with a `Z` suffix (§4.8).
- **`bytes` verification** became a reader requirement, not just a writer one.
- **Conformance classes** (§12) were introduced so an implementation can state what it supports.
- **Reserved top-level names** (§3.5) gained a registry.
