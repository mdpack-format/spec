# MDPack — Markdown Package

**An open, portable package format for Markdown content and its associated assets.**

One Markdown package. All assets included.

A `.mdpack` file is a ZIP container holding a Markdown document, the files it references and a
small JSON manifest. Move it, copy it, e-mail it or sync it as a single file and the images come
with it. Unzip it and you get a working Markdown document plus an `assets/` folder — no rewriting,
no special tooling.

```text
architecture.mdpack
├── mimetype          application/vnd.mdpack+zip
├── mdpack.json       manifest: identity, metadata, asset declarations
├── document.md       ordinary Markdown, referencing assets/…
└── assets/
    ├── container-diagram.png
    ├── appendix.pdf
    └── source-data.csv
```

```md
![Container structure](assets/container-diagram.png)

[Read the appendix](assets/appendix.pdf)
```

## The problem it solves

A Markdown note with pictures is not one thing, it is a `.md` file plus a folder that has to travel
with it. Rename the note and the folder reference rots. Move it to another machine and you discover
you moved half of it. Paste the text into a message and the images vanish. The usual workaround,
Base64 data URIs, inflates the file by a third and destroys readability and diffs.

MDPack keeps the Markdown as Markdown and puts the whole thing in one file.

The references stay ordinary relative paths, which is the part that matters most: a package is not
a walled garden you have to escape from. Unzipping one is the export.

## Read the specification

**[mdpack-format.github.io/spec](https://mdpack-format.github.io/spec/)** — or
[`spec/0.1/index.md`](spec/0.1/index.md) in this repository.

- [JSON Schema for `mdpack.json`](schema/mdpack-manifest-0.1.schema.json)
- [Conformance corpus](tests/) — 41 packages, valid and deliberately malformed, with expected
  outcomes
- [Reserved names registry](registry.md)
- [Changelog](CHANGELOG.md)

## Implementations

| Implementation | Language | Conformance | Notes |
|---|---|---|---|
| MD Vault | C# / .NET | Reader, Writer, Round-trip-preserving | Reference implementation |
| MD Reader Pro | C# / .NET | Reader, Writer | Viewer and light editor |

Built something? Open a pull request adding it here. The only requirement is that it passes the
[conformance corpus](tests/).

## Design principles

- **Not captive.** Because references are relative paths, unzipping a package yields a directory
  that already works in Obsidian, VS Code, GitHub and Pandoc. A format you cannot leave is not a
  format, it is a lock-in.
- **Plain text stays plain.** The Markdown is never encoded, wrapped or escaped.
- **Verifiable.** Every declared asset carries a byte length and a SHA-256 digest, and readers
  must check them.
- **Hostile input by default.** Zip-slip rejection, decompression limits, duplicate-entry
  rejection and strict UTF-8 decoding are normative, not optional advice.
- **Extensible without breakage.** Unknown entries and unknown manifest members must survive a
  read-modify-write cycle, so one application cannot destroy another's data.

## Status

Specification **0.1.0-draft**. Implementable and implemented, but not yet stable: incompatible
changes may land before 1.0. Implementations should describe their support as draft-level.

The route to 1.0 is one release cycle of implementation feedback plus at least one independent
implementation passing the conformance corpus. See [GOVERNANCE.md](GOVERNANCE.md).

## Contributing

Questions, ambiguities and implementation reports are all welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md). If something in the specification is unclear, that is a bug in
the specification.

## License

- Specification text: [CC BY 4.0](LICENSE-SPEC)
- JSON Schema, conformance corpus and tooling: [MIT](LICENSE-CODE)

Vendor the schema and the test files freely; that is what they are for.
