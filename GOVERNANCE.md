# Governance

## Change control

Change control for the MDPack specification currently rests with the maintainers of the
[`mdpack-format`](https://github.com/mdpack-format) organisation, who created the format for
MD Vault.

This is stated plainly because it matters to anyone deciding whether to build on the format: today
MDPack is a single-vendor specification published in the open, not a multi-vendor standard. The
commitments below exist to make that a safe thing to depend on anyway.

## Commitments

1. **The specification is and stays openly licensed.** The text is CC BY 4.0, the schema and
   conformance corpus are MIT. These licences are irrevocable.
2. **Breaking changes are announced and versioned.** Before 1.0 the format may change
   incompatibly, but every such change is recorded in [CHANGELOG.md](CHANGELOG.md) with a
   migration note. After 1.0, any change that makes a previously valid package invalid, or
   changes how a valid package must be interpreted, requires a new major version.
3. **Changes happen in public.** Every normative change arrives as a pull request with a
   rationale.
4. **Export stays in the specification.** The mapping to plain Markdown plus an `assets/` folder
   is a normative appendix. It will not be removed, and references will stay relative paths rather
   than a custom URI scheme, because that mapping is what makes the format non-captive.
5. **Governance can move.** If independent implementations appear, change control will be
   transferred to a working group drawn from their maintainers. That is the intended destination,
   not a hypothetical.

## Decision process

- **Editorial changes** — typos, clarifications, better examples, non-normative notes — are merged
  by any maintainer.
- **Normative changes** — anything that changes a MUST, SHOULD or MAY — require an issue
  describing the problem, a minimum of 14 days for comment, and agreement from the maintainers.
  Implementers listed in the [implementations table](README.md#implementations) are notified on
  the issue.
- **Breaking changes** require all of the above plus a migration path and a version bump.

## Versioning

The manifest's `version` member carries the specification version the package was written against.
It is a string so it can express pre-release qualifiers, which is why this draft writes
`0.1.0-draft` rather than `0.1.0`.

MDPack follows semantic versioning:

- Before 1.0, any release may change the format incompatibly.
- After 1.0, a **patch** release carries clarifications and non-substantive corrections; a
  **minor** release adds backward-compatible optional features; a **major** release may change
  structure or semantics incompatibly.

Releases are Git tags: `spec-0.1.0-draft`, `spec-1.0.0`. Tags are never moved or deleted.

## The path to 1.0

1.0 is declared once all of the following hold:

- At least one implementation other than the reference passes the full conformance corpus.
- No unresolved normative ambiguity has been reported for one release cycle.
- The media type registration in Appendix A has been submitted to IANA.

Everything deferred to "future work" in the specification — multi-document packages, asset URI
references by identifier, signatures, encryption — is explicitly out of scope for 1.0.

## Reserved names

Top-level entry names and manifest members are a shared namespace. New reservations are recorded in
[registry.md](registry.md) and follow the normative-change process above. Vendor extensions do not
need a reservation: use a reverse domain name you control for manifest members, and open an issue
before claiming a new top-level directory.
