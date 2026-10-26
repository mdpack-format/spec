# MDPack specification amendment — 0.2.0-draft: Encryption profile `mdpack-enc-1`

This document defines the 0.1.0-draft → 0.2.0-draft change of the MDPack
specification. The change is **additive**: every package valid under 0.1
remains valid under 0.2 with exactly the same meaning. The single new
construct is the optional manifest member `encryption`, which switches a
package to the encryption profile defined as new §13.

Suggested CHANGELOG entry:

```markdown
## 0.2.0-draft

- Added the optional encryption profile `mdpack-enc-1` (§13): password-based
  AES-256-GCM encryption of the entry document and assets inside a single
  `payload.mdpe` entry, with a metadata-free clear manifest.
- Unencrypted packages are unchanged; all 0.1 packages remain valid. A 0.2
  reader accepts manifest versions `0.1.0-draft`, `0.1.0`, `0.2.0-draft` and
  `0.2.0`.
- New reader failure mode `encrypted-unsupported` (§8.9).
- `payload.mdpe` added to the reserved root names (§3.5).
```

---

## 1. Edits to existing sections

### §2.2 (Non-goals for 0.1 → 0.2)

Replace the bullet:

> Encryption, digital signatures, revision history or synchronisation.

with:

> Digital signatures, revision history or synchronisation. Password
> encryption is defined as an optional profile (§13); it is not part of the
> unencrypted core, and unencrypted packages remain exactly as specified.

### §3.1 (ZIP requirements)

The existing rule stands unchanged and applies to **all** packages,
encrypted or not: *writers MUST NOT produce ZIP-encrypted entries; readers
MUST reject a package containing any encrypted entry.* Format-level
encryption (§13) is not ZIP encryption: `payload.mdpe` is an ordinary
Deflate or Store entry whose *content* is ciphertext under the profile's
own key schedule. Append one sentence to §3.1:

> An encrypted package (§13) uses the profile's own encryption; the
> prohibition above covers ZIP-level encryption only, which remains
> forbidden and hostile in every package.

### §3.5 (Optional and reserved entries)

Add a row to the table:

| Path | Status |
|---|---|
| `payload.mdpe` | Reserved. The encrypted payload of a package using the encryption profile (§13). |

### §4.4 (Root members)

Add a row to the table:

| Member | Type | Writer | Reader | Notes |
|---|---|---|---|---|
| `encryption` | object | **MUST** emit if and only if the package is encrypted | MUST process per §13; MUST NOT silently ignore | Presence switches the package to the encryption profile |

### §4.1 (Encoding and shape)

Append:

> The general rule that unknown members are ignored does not weaken the
> `encryption` member in 0.2: it is defined by this specification. A
> conforming 0.2 reader that does not implement the profile MUST fail the
> package with `encrypted-unsupported` (§8.9); it MUST NOT treat an
> encrypted package as plain.

### §4.5 (Version handling)

Append:

> A 0.2 reader MUST accept `0.1.0-draft`, `0.1.0`, `0.2.0-draft` and
> `0.2.0` for unencrypted packages. An encrypted package (§13.2) MUST
> carry `0.2.0-draft` or `0.2.0`, so a 0.1 reader reports
> `unsupported-version` — "upgrade", not "corrupt".

### §8.9 (Error reporting)

Add one failure mode to the list:

> `encrypted-unsupported`: the package is a structurally valid encrypted
> package (§13), but this reader does not implement the encryption profile.

---

## 2. New §13 — Encryption (profile `mdpack-enc-1`)

### 13.1 Overview

An encrypted package stores the entry document and every asset as
ciphertext inside a single payload entry, `payload.mdpe`. The ZIP container
and the manifest remain readable without the password; everything that
describes user content — title, timestamps, asset names, the Markdown
itself — lives inside the encrypted header.

Encryption protects **confidentiality only**. As in §7.1, integrity tags
detect modification but say nothing about who produced the package, and a
matching tag is not evidence of safety.

### 13.2 The clear manifest of an encrypted package

A package is encrypted if and only if the manifest carries an `encryption`
member. When it is present:

- `encryption` MUST be an object with exactly these members:

  | Member | Value |
  |---|---|
  | `profile` | const `"mdpack-enc-1"` |
  | `kdf` | object: `algo` (const `"pbkdf2-hmac-sha256"`), `iterations` (integer ≥ 600 000), `salt` (Base64, standard alphabet, 16–64 decoded bytes) |
  | `cipher` | const `"aes-256-gcm"` |
  | `payload` | const `"payload.mdpe"` |

- `version` MUST be `"0.2.0-draft"` or `"0.2.0"`.
- `assets` MUST be present and empty.
- `title`, `description`, `createdAt`, `modifiedAt`, `generator`,
  `markdownDialect` and `documentSha256` are user content: writers **MUST
  NOT** emit them in the clear manifest, and a reader **MUST** treat their
  presence, or a non-empty `assets`, as `malformed-manifest`.
- `entrypoint` remains `"document.md"`: it names the logical entry inside
  the encrypted payload, not an archive entry.
- No archive entry other than `mimetype`, `mdpack.json` and `payload.mdpe`
  MAY be present. Any other entry lies outside every integrity guarantee
  of the profile; a reader **MUST** reject the package with
  `security-violation`.
- `iterations` below the floor of 600 000 **MUST** be rejected with
  `security-violation` (a reader must not be tricked into weak KDF work).

### 13.3 Key derivation

- The password string MUST be normalized to Unicode NFC and encoded as
  UTF-8 before use. Writers and readers perform the identical conversion.
- The master key (KEK) is `PBKDF2-HMAC-SHA256(password, salt, iterations,
  dkLen = 32)` bytes.
- Frame keys are derived with HKDF-SHA256 (expand only, empty salt,
  L = 32):
  - header key: `info = "mdpack-enc-1 header"`;
  - data key for an entry: `info = "mdpack-enc-1 frame" || 0x00 ||
    entryPathUTF8`.
- The salt MUST be freshly generated for every write; key material derived
  for one package MUST NOT be reused for another.

### 13.4 The payload entry

The content of `payload.mdpe` is:

1. The 11 ASCII bytes `MDPACKENC1` followed by one `0x0A` byte.
2. The header frame (§13.5) — the encrypted inner manifest.
3. The data frames (§13.5) — one per content entry, `document.md` first,
   then the assets in the order of their inner declarations.

### 13.5 Frames

Each frame is:

- a 12-byte nonce, uniformly random, fresh per frame (the frame count per
  package is small and every key is fresh, so random nonces are safe under
  GCM's bounds);
- a 4-byte unsigned little-endian ciphertext length L (excluding the tag);
- L bytes of AES-256-GCM ciphertext followed by the 16-byte
  authentication tag.

Frame plaintexts:

- The **header frame** plaintext is a JSON object, UTF-8 without BOM:

  ```json
  {
    "format": "mdpack-enc-1",
    "manifest": { "…inner manifest, plain-manifest shape (§4)…" },
    "entries": [
      { "path": "document.md", "plainBytes": 1234 },
      { "path": "assets/diagram.png", "plainBytes": 45678 }
    ]
  }
  ```

  The inner manifest follows §4 in full, including complete asset
  declarations (`bytes` and `sha256` cover the **plaintext**).
  `documentSha256` SHOULD be emitted there and covers the plaintext bytes
  of `document.md`. The `entries` array MUST list `document.md` first,
  then every declared asset in declaration order; its length MUST equal
  the number of data frames that follow.

- A **data frame** plaintext is the entry's raw bytes, zero-padded to a
  multiple of 256 bytes (size-hiding; the true length is `plainBytes` in
  the header).

- AAD binds every frame to its identity: for the header frame
  `"mdpack-enc-1" || 0x00 || "mdpack.json"`; for a data frame
  `"mdpack-enc-1" || 0x00 || <entry path UTF-8>`. Frames therefore cannot
  be swapped within a package or transplanted between packages without
  detection. Nonces are not secret and are stored in the frame.

### 13.6 Reader requirements

A reader implementing the profile:

1. Validates §13.2 against the clear manifest
   (`malformed-manifest` / `security-violation` as specified there).
2. Opens `payload.mdpe` and checks the magic bytes; a mismatch is
   `integrity-failure`.
3. Decrypts the header frame with the header key; an authentication
   failure is `integrity-failure` (this includes the wrong-password case —
   see the note below).
4. Parses the inner manifest with the full strictness of §4: strict UTF-8
   without BOM, required members enforced, unknown members ignored.
5. Decrypts each data frame on first use with its entry's frame key,
   verifies the AAD and the tag (`integrity-failure` on failure), verifies
   that the padding bytes are zero and that the plaintext length and
   SHA-256 match the inner declaration (`integrity-failure` otherwise).
   All §8.3 resource limits apply to decrypted byte counts.
6. Reports a valid encrypted package without credentials as
   `encrypted-unsupported` (0.2 reader with the profile disabled) or
   `unsupported-version` (0.1-era reader) — never as corruption (§8.9).

> Note (non-normative): a wrong password and a damaged frame are
> indistinguishable at the crypto layer — both surface as GCM tag
> failures. Applications SHOULD phrase the message as "wrong password, or
> the file is damaged".

### 13.7 Writer requirements

- Fresh salt, fresh key material and fresh random nonces on every write.
- The clear manifest carries no user content (§13.2).
- §9.2 applies unchanged: build in a temporary file, verify the fresh
  package with a complete read, atomically replace. Never rewrite in
  place.
- An editor that modifies an encrypted package decrypts, modifies and
  re-encrypts the whole payload with fresh randomness; incremental
  per-entry rewrite is not defined in this version.
- Writers SHOULD zero derived key material when the platform allows it.

### 13.8 Conformance

- A Conforming Reader of 0.2 that implements the profile MUST satisfy §13
  for every corpus package marked with the profile, in addition to all
  unencrypted requirements of §3–§9.
- A Conforming Reader that does not implement the profile MUST fail
  encrypted packages as specified in §13.6 step 6.
- A Conforming Writer of unencrypted packages is unaffected by this
  section.

---

## 3. Registry (registry.md)

Add:

```markdown
- `payload.mdpe` — the encrypted payload of a package using the encryption
  profile `mdpack-enc-1` (specification 0.2 §13).
```

## 4. Schema (schema/mdpack-manifest-0.2.schema.json)

A ready-to-commit schema file ships next to this amendment
(`schema/mdpack-manifest-0.2.schema.json`). It extends the 0.1 schema with
the `encryption` member, validates both 0.1 and 0.2 version values, and
enforces §13.2 conditionally (metadata ban and empty `assets` when
`encryption` is present). Where this schema and §13 disagree, §13 governs,
as usual.
