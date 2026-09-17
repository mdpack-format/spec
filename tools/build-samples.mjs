// Builds the illustrative MDPack samples under samples/.
//
// Source media lives in samples/_src/. Generated .mdpack files are committed so
// visitors can download them without running Node. Rebuild after changing
// sources or the Markdown bodies:
//
//     node tools/build-samples.mjs
//
// MIT licensed, see LICENSE-CODE.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildZip } from './zip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplesDir = join(root, 'samples');
const srcDir = join(samplesDir, '_src');

mkdirSync(samplesDir, { recursive: true });

const MIMETYPE = 'application/vnd.mdpack+zip';
const VERSION = '0.1.0-draft';
const GENERATOR = { name: 'mdpack-samples', version: '0.1.0' };

const sha256 = (data) =>
    createHash('sha256').update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')).digest('hex');

const mimetypeEntry = () => ({ name: 'mimetype', data: MIMETYPE, method: 'store' });
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const load = (...parts) => readFileSync(join(srcDir, ...parts));

const star = load('shared', 'star.png');
const cover = load('generated', 'note-with-star-cover.png');
const portable = load('generated', 'portable-package.png');
const anatomy = load('generated', 'container-anatomy.png');
const relativeSvg = load('generated', 'relative-paths.svg');
const checklistCsv = load('generated', 'checklist.csv');
const appendixPdf = load('generated', 'appendix-notes.pdf');

function asset(id, fileName, mediaType, data, role, extra = {}) {
    return {
        id,
        path: `assets/${fileName}`,
        mediaType,
        bytes: data.length,
        sha256: sha256(data),
        role,
        ...extra,
    };
}

function writePackage(fileName, {
    id,
    title,
    description,
    createdAt,
    modifiedAt,
    document,
    markdownDialect = 'commonmark',
    assets,
    files,
}) {
    const manifest = {
        format: 'mdpack',
        version: VERSION,
        id,
        title,
        description,
        createdAt,
        modifiedAt,
        generator: GENERATOR,
        markdownDialect,
        entrypoint: 'document.md',
        documentSha256: sha256(document),
        assets: assets.map(({ data, ...declaration }) => declaration),
    };

    const entries = [
        mimetypeEntry(),
        { name: 'mdpack.json', data: json(manifest) },
        { name: 'document.md', data: document },
        ...files.map(({ name, data }) => ({ name, data })),
    ];

    const zip = buildZip(entries);
    writeFileSync(join(samplesDir, fileName), zip);
    return { fileName, title, bytes: zip.length, assetCount: assets.length };
}

const catalog = [];

{
    const document = `# Hello, MDPack

This is a tiny, self-contained Markdown note. The star below travels with the
file — no sidecar folder, no broken relative links.

![A rounded yellow star](assets/star.png)

## Why this sample exists

Open \`hello-star.mdpack\` in any conforming reader, or unzip it and open
\`document.md\` in a plain editor. Either way the image resolves through the
ordinary relative path \`assets/star.png\`.

> One Markdown package. All assets included.
`;

    const starAsset = asset(
        '01K6SAMPLE000000000STAR0001',
        'star.png',
        'image/png',
        star,
        'inline',
        { originalName: 'star.png', description: 'Rounded yellow star icon used throughout the samples.' },
    );

    catalog.push(writePackage('hello-star.mdpack', {
        id: '01K6SAMPLE000000HELLOSTAR01',
        title: 'Hello, MDPack',
        description: 'The smallest illustrative package: one Markdown document and one PNG.',
        createdAt: '2026-09-17T15:00:00Z',
        modifiedAt: '2026-09-17T15:00:00Z',
        document,
        assets: [starAsset],
        files: [{ name: 'assets/star.png', data: star }],
    }));
}

{
    const document = `# Why MDPack

Markdown with pictures is usually **two things**: a \`.md\` file and a folder that
has to travel with it. Rename the note and the folder reference rots. Share only
the text and the images vanish.

![Scattered files become one package](assets/portable-package.png)

MDPack keeps the Markdown as Markdown and puts the whole note in **one**
\`.mdpack\` file. References stay ordinary relative paths, so unzipping a package
is the export — Obsidian, VS Code, GitHub and Pandoc already understand the
result.

![Favourite star](assets/star.png)

## What you get

| Piece | Role |
|:------|:-----|
| \`mimetype\` | Optional first entry for content sniffing |
| \`mdpack.json\` | Identity, metadata, asset declarations |
| \`document.md\` | The note itself |
| \`assets/\` | Images, PDFs, CSV and anything else you declare |

See also the [specification](https://mdpack-format.github.io/spec/) and the
conformance corpus in this repository.
`;

    const assets = [
        asset('01K6SAMPLE000000000COVER001', 'note-with-star-cover.png', 'image/png', cover, 'cover', {
            description: 'Cover illustration: a note page with a star sticker.',
        }),
        asset('01K6SAMPLE000000000PORTABLE', 'portable-package.png', 'image/png', portable, 'inline', {
            description: 'Side-by-side comparison of scattered files versus one package.',
        }),
        asset('01K6SAMPLE000000000STAR0002', 'star.png', 'image/png', star, 'inline', {
            originalName: 'star.png',
        }),
    ];

    catalog.push(writePackage('why-mdpack.mdpack', {
        id: '01K6SAMPLE000000WHYMDPACK01',
        title: 'Why MDPack',
        description: 'A short product pitch with a cover image, a comparison figure and the sample star.',
        createdAt: '2026-09-17T15:10:00Z',
        modifiedAt: '2026-09-17T15:10:00Z',
        document,
        assets,
        files: [
            { name: 'assets/note-with-star-cover.png', data: cover },
            { name: 'assets/portable-package.png', data: portable },
            { name: 'assets/star.png', data: star },
        ],
    }));
}

{
    const document = `# Package anatomy

A conforming \`.mdpack\` is a ZIP archive. The first entry is the uncompressed
\`mimetype\` marker; everything else follows in a predictable layout.

![MDPack container layers](assets/container-anatomy.png)

Inside Markdown you never invent a custom URI scheme. Point at files the same
way you would in a folder:

\`\`\`md
![Star](assets/star.png)
![Paths](assets/relative-paths.svg)
[Open the appendix](assets/appendix-notes.pdf)
\`\`\`

![Star icon](assets/star.png)

![Relative paths diagram](assets/relative-paths.svg)

The checklist below is shipped as a CSV \`source\` asset — useful when a note
needs machine-readable data next to the prose.

[Download checklist.csv](assets/checklist.csv) · [Appendix PDF](assets/appendix-notes.pdf)
`;

    const assets = [
        asset('01K6SAMPLE000000000ANATOMY1', 'container-anatomy.png', 'image/png', anatomy, 'inline', {
            description: 'Layer diagram of mimetype, manifest, document and assets/.',
        }),
        asset('01K6SAMPLE000000000STAR0003', 'star.png', 'image/png', star, 'inline'),
        asset('01K6SAMPLE000000000RELPATH1', 'relative-paths.svg', 'image/svg+xml', relativeSvg, 'inline', {
            description: 'SVG figure showing document.md linking to assets/star.png.',
        }),
        asset('01K6SAMPLE000000000CHECKCSV', 'checklist.csv', 'text/csv', checklistCsv, 'source', {
            originalName: 'checklist.csv',
            description: 'Sample tabular source data referenced from the note.',
        }),
        asset('01K6SAMPLE000000000APPENDIX', 'appendix-notes.pdf', 'application/pdf', appendixPdf, 'attachment', {
            originalName: 'appendix-notes.pdf',
            description: 'Tiny PDF attachment for the attachment role demo.',
        }),
    ];

    catalog.push(writePackage('package-anatomy.mdpack', {
        id: '01K6SAMPLE000000ANATOMY0001',
        title: 'Package anatomy',
        description: 'Walkthrough of the container layout with PNG, SVG, CSV and PDF assets.',
        createdAt: '2026-09-17T15:20:00Z',
        modifiedAt: '2026-09-17T15:20:00Z',
        document,
        assets,
        files: [
            { name: 'assets/container-anatomy.png', data: anatomy },
            { name: 'assets/star.png', data: star },
            { name: 'assets/relative-paths.svg', data: relativeSvg },
            { name: 'assets/checklist.csv', data: checklistCsv },
            { name: 'assets/appendix-notes.pdf', data: appendixPdf },
        ],
    }));
}

{
    const document = `# Kitchen sink

A denser sample that exercises several asset roles in one note. Open it in a
reader that implements MDPack 0.1, or unzip and browse \`assets/\`.

![Cover](assets/note-with-star-cover.png)

## Inline figures

![Portable packaging](assets/portable-package.png)

![Container anatomy](assets/container-anatomy.png)

![Relative paths](assets/relative-paths.svg)

![Star](assets/star.png)

## Attachments and sources

- Checklist (CSV, role \`source\`): [checklist.csv](assets/checklist.csv)
- Appendix (PDF, role \`attachment\`): [appendix-notes.pdf](assets/appendix-notes.pdf)

## Reader checklist

1. Accept the package (valid \`format\`, \`version\`, \`entrypoint\`).
2. Verify every declared \`bytes\` / \`sha256\` pair.
3. Resolve \`assets/…\` without a custom URI scheme.
4. Keep unknown manifest members and unknown entries on round-trip save.
`;

    const assets = [
        asset('01K6SAMPLE000000000COVER002', 'note-with-star-cover.png', 'image/png', cover, 'cover'),
        asset('01K6SAMPLE000000000PORTABL2', 'portable-package.png', 'image/png', portable, 'inline'),
        asset('01K6SAMPLE000000000ANATOMY2', 'container-anatomy.png', 'image/png', anatomy, 'inline'),
        asset('01K6SAMPLE000000000RELPATH2', 'relative-paths.svg', 'image/svg+xml', relativeSvg, 'inline'),
        asset('01K6SAMPLE000000000STAR0004', 'star.png', 'image/png', star, 'inline'),
        asset('01K6SAMPLE000000000CHECKCS2', 'checklist.csv', 'text/csv', checklistCsv, 'source'),
        asset('01K6SAMPLE000000000APPENDX2', 'appendix-notes.pdf', 'application/pdf', appendixPdf, 'attachment'),
    ];

    catalog.push(writePackage('kitchen-sink.mdpack', {
        id: '01K6SAMPLE000000KITCHENSINK',
        title: 'Kitchen sink',
        description: 'All sample media in one package: cover, inline figures, SVG, CSV and PDF.',
        createdAt: '2026-09-17T15:30:00Z',
        modifiedAt: '2026-09-17T15:30:00Z',
        document,
        assets,
        files: [
            { name: 'assets/note-with-star-cover.png', data: cover },
            { name: 'assets/portable-package.png', data: portable },
            { name: 'assets/container-anatomy.png', data: anatomy },
            { name: 'assets/relative-paths.svg', data: relativeSvg },
            { name: 'assets/star.png', data: star },
            { name: 'assets/checklist.csv', data: checklistCsv },
            { name: 'assets/appendix-notes.pdf', data: appendixPdf },
        ],
    }));
}

const index = [
    '# MDPack samples',
    '',
    'Illustrative `.mdpack` files for humans — not the conformance corpus.',
    'Open them in [MD Vault](https://github.com/mdpack-format) / MD Reader Pro, or unzip',
    'and read `document.md` with any Markdown tool.',
    '',
    'Rebuild after editing sources:',
    '',
    '```bash',
    'node tools/build-samples.mjs',
    '```',
    '',
    '| Package | What it shows |',
    '|:--------|:--------------|',
    ...catalog.map((item) =>
        `| [\`${item.fileName}\`](${item.fileName}) | ${item.title} — ${item.assetCount} asset(s) |`),
    '',
    '## Source media',
    '',
    'Editable inputs live under [`_src/`](_src/):',
    '',
    '- `_src/shared/star.png` — the yellow star used across samples',
    '- `_src/generated/` — diagrams, cover art, SVG, CSV and a tiny PDF',
    '',
    'The built `.mdpack` files are committed so Pages and the GitHub UI can serve',
    'them as downloads without a build step.',
    '',
].join('\n');

writeFileSync(join(samplesDir, 'README.md'), index);

for (const item of catalog) {
    console.log(`wrote ${item.fileName} (${item.bytes} bytes, ${item.assetCount} assets)`);
}
console.log('wrote samples/README.md');
