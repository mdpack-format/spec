# MDPack samples

Illustrative `.mdpack` files for humans — not the conformance corpus.
Open them in [MD Vault](https://github.com/mdpack-format) / MD Reader Pro, or unzip
and read `document.md` with any Markdown tool.

Rebuild after editing sources:

```bash
node tools/build-samples.mjs
```

| Package | What it shows |
|:--------|:--------------|
| [`hello-star.mdpack`](hello-star.mdpack) | Hello, MDPack — 1 asset(s) |
| [`why-mdpack.mdpack`](why-mdpack.mdpack) | Why MDPack — 3 asset(s) |
| [`package-anatomy.mdpack`](package-anatomy.mdpack) | Package anatomy — 5 asset(s) |
| [`kitchen-sink.mdpack`](kitchen-sink.mdpack) | Kitchen sink — 7 asset(s) |

## Source media

Editable inputs live under [`_src/`](_src/):

- `_src/shared/star.png` — the yellow star used across samples
- `_src/generated/` — diagrams, cover art, SVG, CSV and a tiny PDF

The built `.mdpack` files are committed so Pages and the GitHub UI can serve
them as downloads without a build step.
