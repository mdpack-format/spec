# Changelog

All notable changes to the MDPack specification are recorded here.

The specification version and the manifest `version` member are the same string. Before 1.0 any
release may change the format incompatibly; see [GOVERNANCE.md](GOVERNANCE.md).

## 0.2.0-draft — 2026-10-24

Additive revision: every package valid under 0.1 remains valid under 0.2 with exactly the same
meaning. The only new construct is the optional manifest member `encryption`.

### Added

- **Encryption profile `mdpack-enc-1`** (§13): password-based AES-256-GCM encryption of the entry
  document, the assets and the full inner manifest inside a single reserved `payload.mdpe` entry;
  the clear manifest carries no user content. PBKDF2-HMAC-SHA256 at ≥600 000 iterations,
  HKDF-SHA256 per-frame keys, AEAD associated data binding each frame to its entry path, and
  256-byte frame padding to hide exact sizes.
- **`payload.mdpe`** added to the reserved root names (§3.5) and the registry.
- **New reader failure mode** `encrypted-unsupported` (§8.9).
- **`encryption`** added to the reserved manifest members.
- A **Conforming Encrypted-Profile Reader** conformance class (§13.8).
- **Schema 0.2** (`schema/mdpack-manifest-0.2.schema.json`) validating both unencrypted and
  encrypted manifests.

### Changed

- A 0.2 reader accepts manifest versions `0.1.0-draft`, `0.1.0`, `0.2.0-draft` and `0.2.0` for
  unencrypted packages (§4.5). Encrypted packages pin 0.2, so a 0.1 reader reports
  `unsupported-version` rather than corruption.
- The ZIP-level ban on encrypted entries (§3.1) is restated to cover ZIP crypto only; the
  profile’s own mechanism is declared, verified and separate.

## 0.1.0-draft — 2026-09-17

First public draft. Establishes the name, the container layout, the manifest shape and the
relative-path reference model.

### Format

- `.mdpack` file extension, `application/vnd.mdpack+zip` media type.
- ZIP container with a root-level `mdpack.json` manifest and a `document.md` entry document.
- Assets stored under `assets/` and referenced from Markdown by ordinary relative paths. There is
  no custom URI scheme: unzipping a package is the export.
- Optional `mimetype` first entry, stored uncompressed, for content sniffing.
- Required manifest members `format`, `version`, `entrypoint` and `assets`; recommended `id`,
  `title`, `createdAt`, `modifiedAt`, `generator`, `markdownDialect`, `description` and
  `documentSha256`.
- Each declared asset carries `id`, `path`, `mediaType`, `bytes`, `sha256` and `role`, with the
  roles `inline`, `attachment`, `cover`, `source` and `derived`.

### Normative requirements

- Reader and writer conformance classes, plus a round-trip-preserving writer class.
- Path traversal rejection, duplicate-entry rejection, strict UTF-8 decoding, and resource limits
  counted from bytes as actually decompressed.
- Integrity verification of `bytes`, asset `sha256` and `documentSha256` whenever present.
- Atomic saving; no in-place rewrite.
- Preservation of unknown entries and unknown manifest members across a read-modify-write cycle.
- SVG rendering restrictions and a prohibition on automatic execution or network fetching.

### Published alongside

- [JSON Schema](schema/mdpack-manifest-0.1.schema.json) for `mdpack.json`.
- A [conformance corpus](tests/) of 41 packages with machine-readable expectations.
- [Illustrative samples](samples/) (`hello-star`, `why-mdpack`, `package-anatomy`, `kitchen-sink`).
- A [reserved names registry](registry.md).

### Samples update — 2026-09-17 (same draft)

Added English-language sample packages under [`samples/`](samples/) with shared star artwork,
generated diagrams, an SVG figure, a CSV source file and a tiny PDF attachment. Rebuild with
`node tools/build-samples.mjs`.

### Notes for readers of the originally circulated 0.1.0 draft

The container layout, manifest shape and reference model are unchanged. This release adds the
normative detail an independent implementer would otherwise have to invent, and it moves the JSON
Schema and conformance corpus out of "future work" and into the repository. Appendix E of the
specification lists every addition.

The one substantive addition to the manifest is the optional `documentSha256` member. Without it
the entry document — the file every package is guaranteed to have — was the only content with no
integrity protection. It is optional, so packages written against the circulated draft remain
conforming.

### Relationship to MIP

MDPack supersedes an earlier internal format called MIP (Markdown Image Package), which used the
`.mip` extension, a `mip.json` manifest and a `mip://assets/…` URI scheme. MIP was never published
and has no installed base. The two formats are not compatible and no migration path is defined.
