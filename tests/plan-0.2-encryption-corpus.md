# Conformance corpus additions for 0.2.0-draft (encryption profile)

Guidance for `tools/build-corpus.mjs` and `tests/expectations.json`. All
encrypted fixtures are produced with profile `mdpack-enc-1` exactly as
specified in §13 (amendment): AES-256-GCM, PBKDF2-HMAC-SHA256 with 600 000
iterations, HKDF-SHA256 frame keys, 256-byte frame padding, AAD
`"mdpack-enc-1" 0x00 <entry path>`.

## expectations.json — error classes

Add:

```json
"encrypted-unsupported": "The package is a valid encrypted package (§13), but this reader does not implement the encryption profile."
```

Note for the 0.1 corpus line: a 0.1-only reader fails every encrypted
fixture with `unsupported-version`; that remains a conforming outcome and
should be listed alongside the 0.2 classes where noted below.

## New valid fixtures

| File | Content | Notes |
|---|---|---|
| `valid/encrypted-minimal.mdpack` | mimetype, minimal clear manifest (`encryption` member, no metadata), payload with only `document.md` | Smallest conforming encrypted package |
| `valid/encrypted-with-assets.mdpack` | document + PNG + CSV assets | Per-frame AAD, 256-byte padding, plaintext digests verified after decryption |
| `valid/encrypted-unicode.mdpack` | Cyrillic asset name, percent-encoded markdown reference | Encryption must not change §6 resolution rules |

## New invalid fixtures

| File | Construction | Allowed errors |
|---|---|---|
| `invalid/encrypted-weak-kdf.mdpack` | `iterations: 100000` | `security-violation` |
| `invalid/encrypted-tampered-frame.mdpack` | One flipped byte inside a data frame's ciphertext | `integrity-failure` |
| `invalid/encrypted-wrong-magic.mdpack` | Payload starts with `MDPACKENC2\n` | `integrity-failure` |
| `invalid/encrypted-extra-entry.mdpack` | Extra root entry `thief.txt` next to the three allowed entries | `security-violation` |
| `invalid/encrypted-clear-title.mdpack` | `title` present in the clear manifest | `malformed-manifest` |
| `invalid/encrypted-nonempty-assets.mdpack` | Non-empty `assets` in the clear manifest | `malformed-manifest` |
| `invalid/encrypted-bad-aad.mdpack` | Data frame encrypted with AAD of another entry (simulated swap) | `integrity-failure` |
| `invalid/encrypted-version-01.mdpack` | Valid encrypted payload but manifest `version` is `0.1.0-draft` | `malformed-manifest` (0.2 reader), `unsupported-version` (0.1 reader) |
| `invalid/encrypted-bad-padding.mdpack` | Non-zero padding bytes inside a data frame | `integrity-failure` |

## Notes for the generator

- Reuse one canonical password for all valid fixtures (e.g. `corpus`) and
  document it in `tests/README.md`; invalid fixtures may use any password.
- Every valid encrypted fixture must pass a full read: magic, header tag,
  inner manifest validation, all frame tags, padding checks, plaintext
  digests.
- Expectations for encrypted valid fixtures carry
  `"profile": "mdpack-enc-1"` so tooling can distinguish them and so a
  profile-less reader run can substitute `encrypted-unsupported` (0.2
  reader) or `unsupported-version` (0.1 reader) automatically.
