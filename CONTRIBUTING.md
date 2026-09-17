# Contributing

## What is most useful

**Implementation reports.** If you have written a reader or writer, tell us what was ambiguous,
what you had to guess, and what the conformance corpus failed to cover. A specification that only
one team has implemented is a specification full of undiscovered assumptions. While MDPack is a
draft, this is by far the most valuable thing you can contribute.

**Ambiguities.** If two competent engineers could read a sentence and build incompatible things,
that is a bug. Open an issue quoting the sentence.

**Conformance corpus gaps.** A malformed package that a reasonable reader would mishandle, and
that the corpus does not contain, is a valuable contribution on its own.

## Opening an issue

For a specification question, include:

- the section number and the exact text;
- what you implemented, and what you expected;
- if applicable, a package that demonstrates the problem.

For a proposed change, include the problem first and the proposal second. Proposals without a
concrete failing case are hard to evaluate.

## Pull requests

- **Editorial fixes** — typos, grammar, clearer wording, better examples — go straight to a PR.
- **Normative changes** — anything touching a MUST, SHOULD or MAY — need an issue first. See the
  decision process in [GOVERNANCE.md](GOVERNANCE.md).
- **New implementations** in the README table: one row, plus a note on which conformance classes
  you claim. Please make sure the corpus passes first.
- **Sample packages** under [`samples/`](samples/): keep notes in English, declare every asset,
  and rebuild with `node tools/build-samples.mjs` so checksums stay honest.

Keep the diff focused. A PR that fixes a typo and also restructures a section is two PRs.

## Style

- British or American spelling, consistently within a change; the existing text is British.
- Requirement keywords in all capitals, per BCP 14, and only where a requirement is actually
  intended. `MUST` in a sentence that cannot be tested is noise.
- Every normative statement should be testable. If you write a MUST, consider whether a corpus
  file can demonstrate a violation.
- Wrap prose at 100 columns.

## Adding to the conformance corpus

Corpus files are generated, not committed as opaque binaries, so that reviewers can see what a test
package contains. Add a case to [`tools/build-corpus.mjs`](tools/build-corpus.mjs) and regenerate:

```bash
node tools/build-corpus.mjs
```

Each invalid case needs an entry naming the error class a conforming reader must report; the
generator writes `tests/expectations.json` for you. Use the narrowest class that applies.

## Licensing of contributions

By contributing you agree that your contribution is licensed under CC BY 4.0 (specification text)
or MIT (schema, corpus, tooling), matching the file you are changing.
