// Generates the MDPack conformance corpus into tests/.
//
// Corpus packages are generated rather than committed as opaque binaries so
// that a reviewer can see exactly what each test file contains. Run:
//
//     node tools/build-corpus.mjs
//
// MIT licensed, see LICENSE-CODE.

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildZip } from './zip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const validDir = join(root, 'tests', 'valid');
const invalidDir = join(root, 'tests', 'invalid');

for (const directory of [validDir, invalidDir]) {
    rmSync(directory, { recursive: true, force: true });
    mkdirSync(directory, { recursive: true });
}

const MIMETYPE = 'application/vnd.mdpack+zip';
const VERSION = '0.1.0-draft';

/** A 1x1 opaque PNG; small enough to read as hex, real enough to decode. */
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

/** A minimal one-page PDF, used for the attachment and fragment cases. */
const PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
        + '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
        + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 72 72]>>endobj\n'
        + 'trailer<</Root 1 0 R>>\n%%EOF\n',
    'ascii',
);

const sha256 = (data) =>
    createHash('sha256').update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')).digest('hex');

/** The `mimetype` entry: first in the archive, stored, no trailing newline. */
const mimetypeEntry = () => ({ name: 'mimetype', data: MIMETYPE, method: 'store' });

const json = (value) => JSON.stringify(value, null, 2);

/** Builds a declaration for an asset stored at `assets/<name>`. */
const asset = (id, name, mediaType, data, role, extra = {}) => ({
    id,
    path: `assets/${name}`,
    mediaType,
    bytes: data.length,
    sha256: sha256(data),
    role,
    ...extra,
});

const cases = { valid: [], invalid: [] };

function valid(name, description, notes, entries) {
    const file = `${name}.mdpack`;
    writeFileSync(join(validDir, file), buildZip(entries));
    cases.valid.push({ file, description, notes });
}

function invalid(name, description, errors, notes, entries) {
    const file = `${name}.mdpack`;
    writeFileSync(join(invalidDir, file), Buffer.isBuffer(entries) ? entries : buildZip(entries));
    cases.invalid.push({ file, description, errors, notes });
}

// ---------------------------------------------------------------------------
// Valid packages. A Conforming Reader must accept every one of these.
// ---------------------------------------------------------------------------

{
    const document = '# Minimal\n\nA package with no assets.\n';
    valid(
        'minimal',
        'Manifest and document only, no assets.',
        'The smallest conforming package. Note there is no assets/ directory entry: '
            + '0.1 §3.5 requires readers to accept its absence, because ZIP archives do not '
            + 'reliably preserve empty directories.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: '01J8FZ2SK6NHQ6WHFMCRP7YMVG',
                    title: 'Minimal',
                    createdAt: '2026-09-17T07:00:00Z',
                    modifiedAt: '2026-09-17T07:00:00Z',
                    generator: { name: 'mdpack-corpus', version: '0.1.0' },
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
        ],
    );
}

{
    const document =
        '# With assets\n\n'
        + '![Pixel](assets/pixel.png)\n\n'
        + '[The appendix](assets/appendix.pdf)\n';
    valid(
        'with-assets',
        'A PNG and a PDF, both referenced by relative path and both declared.',
        'The core happy path: relative reference resolution (§6.2), byte lengths and '
            + 'checksums (§7), and the inline and attachment roles (§4.9).',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: '01J8FZ3Y8C4Q2X6J9P5A7B1D3E',
                    title: 'With assets',
                    createdAt: '2026-09-17T07:00:00Z',
                    modifiedAt: '2026-09-17T07:10:00Z',
                    generator: { name: 'mdpack-corpus', version: '0.1.0' },
                    markdownDialect: 'commonmark',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [
                        asset('pixel', 'pixel.png', 'image/png', PNG, 'inline', {
                            width: 1,
                            height: 1,
                        }),
                        asset('appendix', 'appendix.pdf', 'application/pdf', PDF, 'attachment'),
                    ],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/pixel.png', data: PNG },
            { name: 'assets/appendix.pdf', data: PDF },
        ],
    );
}

{
    const document = '# No mimetype entry\n\nProduced by a writer that omits it.\n';
    valid(
        'no-mimetype',
        'Package without the mimetype entry.',
        'The mimetype entry is SHOULD for writers and MUST NOT be required by readers (§3.3). '
            + 'A package written with a stock ZIP library will not have one.',
        [
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'no-mimetype',
                    title: 'No mimetype entry',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
        ],
    );
}

{
    const document = '# Bare minimum manifest\n\nOnly the four required members.\n';
    valid(
        'required-members-only',
        'A manifest carrying nothing but format, version, entrypoint and assets.',
        'Every other member is optional (§4.4). A reader must not require id, title or '
            + 'timestamps, and must fall back to the file name for the display title.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    entrypoint: 'document.md',
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
        ],
    );
}

{
    const document = '# Unknown content\n\nThis package carries data this reader does not define.\n';
    const extra = json({ producedBy: 'some other application', arbitrary: [1, 2, 3] });
    valid(
        'unknown-entries',
        'Unknown entries and unknown manifest members that must survive a round trip.',
        'Round-trip-preserving Writers (§12.3) must reproduce thumbnails/cover.png, '
            + 'metadata/extra.json, vendor-notes.txt and the com.example.* manifest members '
            + 'unchanged after a read-modify-write cycle. Readers of any class must accept the '
            + 'file. The .scratch/ entry is the one exception: §3.6 says implementation scratch '
            + 'space must neither be extracted nor preserved.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'unknown-entries',
                    title: 'Unknown content',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                    'com.example.preview': { coverAssetId: 'cover-image', keep: true },
                    'com.example.customField': 'must survive a round trip',
                }),
            },
            { name: 'document.md', data: document },
            { name: 'thumbnails/cover.png', data: PNG },
            { name: 'metadata/extra.json', data: extra },
            { name: 'vendor-notes.txt', data: 'An unclaimed top-level entry.\n' },
            { name: '.scratch/state.json', data: '{"caret":42}' },
        ],
    );
}

{
    const document = '# Untracked asset\n\nNo asset is referenced here.\n';
    valid(
        'untracked-asset',
        'A file under assets/ that the manifest does not declare.',
        'Permitted by §4.7. Readers must accept it; a strict validator reports it as '
            + 'untracked, and cleanup tooling lists it as a deletion candidate (§9.3).',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'untracked-asset',
                    title: 'Untracked asset',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/orphan.png', data: PNG },
        ],
    );
}

{
    const assetName = 'схема сети.png';
    const encoded = encodeURI(assetName);
    const document = `# Percent-encoded reference\n\n![Схема](assets/${encoded})\n`;
    valid(
        'percent-encoded-asset',
        'A Unicode asset name that must be percent-encoded in the Markdown reference.',
        `The document references assets/${encoded}, which decodes to "assets/${assetName}". `
            + 'Exercises step 4 of the resolution algorithm (§6.2) and UTF-8 ZIP entry names '
            + '(§3.1).',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'percent-encoded-asset',
                    title: 'Схема сети',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [asset('diagram', assetName, 'image/png', PNG, 'inline')],
                }),
            },
            { name: 'document.md', data: document },
            { name: `assets/${assetName}`, data: PNG },
        ],
    );
}

{
    const document =
        '# Fragments and queries\n\n'
        + '[Page 3 of the appendix](assets/appendix.pdf#page=3)\n\n'
        + '[With a query](assets/appendix.pdf?download=1)\n';
    valid(
        'fragment-reference',
        'References carrying a fragment and a query component.',
        'Both must resolve to assets/appendix.pdf: §6.5 requires the query and fragment to be '
            + 'stripped before matching. A reader that matches the raw string reports a '
            + 'spurious missing asset.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'fragment-reference',
                    title: 'Fragments and queries',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [asset('appendix', 'appendix.pdf', 'application/pdf', PDF, 'attachment')],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/appendix.pdf', data: PDF },
        ],
    );
}

{
    const document = '# Unknown role\n\n![Pixel](assets/pixel.png)\n';
    valid(
        'unknown-role',
        'An asset declaring a role this specification does not define.',
        '§4.9: readers must ignore unknown role values and must not reject the package. '
            + 'Roles are descriptive metadata, never authorisation.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'unknown-role',
                    title: 'Unknown role',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [asset('pixel', 'pixel.png', 'image/png', PNG, 'com.example.watermark')],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/pixel.png', data: PNG },
        ],
    );
}

{
    const document = '# External links\n\n![Remote](https://example.com/remote.png)\n\n[Mail](mailto:a@example.com)\n';
    valid(
        'external-references',
        'A document referencing only external URLs.',
        '§6.4: external references are not package content. A reader must not fetch them, and '
            + 'in particular must not fetch anything in order to validate the package. Neither '
            + 'reference is a missing asset.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'external-references',
                    title: 'External links',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
        ],
    );
}

{
    const document = '# Byte order mark\n\nThe document starts with a UTF-8 BOM.\n';
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(document, 'utf8')]);
    valid(
        'document-with-bom',
        'document.md prefixed with a UTF-8 byte order mark.',
        '§3.1: writers should omit the BOM but readers must accept and strip one. Note that '
            + 'documentSha256 covers the bytes as stored, including the BOM (§7).',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'document-with-bom',
                    title: 'Byte order mark',
                    entrypoint: 'document.md',
                    documentSha256: sha256(withBom),
                    assets: [],
                }),
            },
            { name: 'document.md', data: withBom },
        ],
    );
}

// ---------------------------------------------------------------------------
// Invalid packages. A Conforming Reader must reject every one of these,
// cleanly and with a distinguishable reason.
// ---------------------------------------------------------------------------

invalid(
    'not-a-zip',
    'Plain text with a .mdpack extension.',
    ['not-an-mdpack'],
    'Must not crash the reader.',
    Buffer.from('This is not a ZIP archive at all.\n', 'utf8'),
);

invalid(
    'truncated-archive',
    'A valid package cut off halfway through.',
    ['not-an-mdpack', 'integrity-failure'],
    'The central directory is gone. Either classification is acceptable; crashing is not.',
    (() => {
        const document = '# Truncated\n';
        const complete = buildZip([
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'truncated',
                    entrypoint: 'document.md',
                    assets: [],
                }),
            },
            { name: 'document.md', data: document },
        ]);
        return complete.subarray(0, Math.floor(complete.length / 2));
    })(),
);

invalid(
    'missing-manifest',
    'A ZIP containing document.md but no mdpack.json.',
    ['not-an-mdpack'],
    '§3.4.',
    [mimetypeEntry(), { name: 'document.md', data: '# No manifest\n' }],
);

invalid(
    'missing-document',
    'Manifest present, document.md absent.',
    ['malformed-manifest'],
    '§3.4. The package declares an entry document it does not contain.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'missing-document',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
    ],
);

invalid(
    'wrong-format',
    'format is "note" rather than "mdpack".',
    ['not-an-mdpack'],
    '§4.4. Compared case-sensitively, so an unrelated ZIP that happens to carry an '
        + 'mdpack.json cannot be mistaken for a package.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'note',
                version: VERSION,
                id: 'wrong-format',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'missing-version',
    'No version member.',
    ['malformed-manifest'],
    '§4.4. A reader must not assume the current version.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                id: 'missing-version',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'version-future',
    'version is "9.0.0".',
    ['unsupported-version'],
    '§4.5. Must be reported distinctly from corruption: the user should be told to upgrade, '
        + 'not told their file is broken.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: '9.0.0',
                id: 'version-future',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'missing-entrypoint',
    'No entrypoint member.',
    ['malformed-manifest'],
    '§4.4 and §4.6: entrypoint is required. A reader must not silently assume "document.md".',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'missing-entrypoint',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'entrypoint-traversal',
    'entrypoint is "../outside.md".',
    ['security-violation', 'malformed-manifest'],
    '§4.6: in this version entrypoint must be exactly "document.md", and a reader must never '
        + 'follow it as an arbitrary path. A reader that resolves it against the extraction '
        + 'directory reads a file outside the package.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'entrypoint-traversal',
                entrypoint: '../outside.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'missing-assets',
    'No assets member.',
    ['malformed-manifest'],
    '§4.4: assets is required, even when empty. Unlike most optional members it carries '
        + 'meaning by its absence, so the specification pins it down rather than defaulting it.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'missing-assets',
                entrypoint: 'document.md',
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'null-assets',
    'assets is JSON null.',
    ['malformed-manifest'],
    'A deserialiser that maps this onto a null collection reference will throw when it '
        + 'iterates. The reader must report a clean error instead (§8.9).',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: '{"format":"mdpack","version":"0.1.0-draft","id":"null-assets","entrypoint":"document.md","assets":null}',
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'assets-not-an-array',
    'assets is an object rather than an array.',
    ['malformed-manifest'],
    'Same hazard as null-assets: the structural shape must be validated before deserialisation '
        + 'results are used.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: '{"format":"mdpack","version":"0.1.0-draft","id":"assets-object","entrypoint":"document.md","assets":{}}',
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'asset-missing-entry',
    'The manifest declares an asset the package does not contain.',
    ['malformed-manifest'],
    '§4.7. Without this check the document renders with silently broken images.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'asset-missing-entry',
                entrypoint: 'document.md',
                assets: [asset('phantom', 'phantom.png', 'image/png', PNG, 'inline')],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'asset-outside-assets',
    'A declared asset whose path is not under assets/.',
    ['malformed-manifest'],
    '§4.7: a declaration must point under assets/. Permitting arbitrary paths would let a '
        + 'manifest lay claim to mdpack.json or document.md.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'asset-outside-assets',
                entrypoint: 'document.md',
                assets: [
                    {
                        id: 'stray',
                        path: 'elsewhere/pixel.png',
                        mediaType: 'image/png',
                        bytes: PNG.length,
                        sha256: sha256(PNG),
                        role: 'inline',
                    },
                ],
            }),
        },
        { name: 'document.md', data: '# x\n' },
        { name: 'elsewhere/pixel.png', data: PNG },
    ],
);

invalid(
    'asset-duplicate-id',
    'Two declared assets sharing an id.',
    ['malformed-manifest'],
    '§4.7: identifiers must be unique within the assets array. A reader keyed by id would '
        + 'silently drop one of them.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'asset-duplicate-id',
                entrypoint: 'document.md',
                assets: [
                    asset('pixel', 'first.png', 'image/png', PNG, 'inline'),
                    asset('pixel', 'second.png', 'image/png', PNG, 'inline'),
                ],
            }),
        },
        { name: 'document.md', data: '# x\n' },
        { name: 'assets/first.png', data: PNG },
        { name: 'assets/second.png', data: PNG },
    ],
);

invalid(
    'asset-missing-role',
    'A declared asset with no role member.',
    ['malformed-manifest'],
    '§4.7: id, path, mediaType, bytes, sha256 and role are all required of a writer. A '
        + 'declaration missing one of them is not a valid declaration.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'asset-missing-role',
                entrypoint: 'document.md',
                assets: [
                    {
                        id: 'pixel',
                        path: 'assets/pixel.png',
                        mediaType: 'image/png',
                        bytes: PNG.length,
                        sha256: sha256(PNG),
                    },
                ],
            }),
        },
        { name: 'document.md', data: '# x\n' },
        { name: 'assets/pixel.png', data: PNG },
    ],
);

invalid(
    'asset-bytes-mismatch',
    'A declared asset whose bytes value does not match the stored length.',
    ['integrity-failure'],
    '§4.7 makes byte-length verification a reader requirement, not just a writer one. This '
        + "package's sha256 is correct, so a reader that only checks digests accepts it.",
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'asset-bytes-mismatch',
                entrypoint: 'document.md',
                assets: [
                    {
                        id: 'pixel',
                        path: 'assets/pixel.png',
                        mediaType: 'image/png',
                        bytes: PNG.length + 100,
                        sha256: sha256(PNG),
                        role: 'inline',
                    },
                ],
            }),
        },
        { name: 'document.md', data: '# x\n' },
        { name: 'assets/pixel.png', data: PNG },
    ],
);

invalid(
    'bad-mimetype-entry',
    'A mimetype entry whose contents are wrong.',
    ['not-an-mdpack'],
    '§3.3: the entry is optional, but when present it must be correct.',
    [
        { name: 'mimetype', data: 'application/epub+zip', method: 'store' },
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'bad-mimetype-entry',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

for (const [name, entryPath, note] of [
    ['traversal-parent', '../evil.txt', 'A parent segment at the root of the path.'],
    ['traversal-absolute', '/etc/passwd', 'An absolute POSIX path.'],
    ['traversal-drive', 'C:/evil.txt', 'A Windows drive letter.'],
    ['traversal-nested', 'assets/../../evil.txt', 'Parent segments hidden inside an otherwise valid prefix.'],
    ['traversal-backslash', '..\\evil.txt', 'Backslash separators, which some readers normalise too late.'],
]) {
    invalid(
        name,
        `Package holding an entry named ${JSON.stringify(entryPath)}.`,
        ['security-violation'],
        `${note} §8.2: an unsafe path invalidates the whole package, not just that entry. `
            + 'The manifest and document here are otherwise perfectly valid, so a reader that '
            + 'only validates paths at extraction time will wrongly accept this file.',
        [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'traversal',
                    entrypoint: 'document.md',
                    assets: [],
                }),
            },
            { name: 'document.md', data: '# x\n' },
            { name: entryPath, data: 'owned\n' },
        ],
    );
}

invalid(
    'duplicate-document',
    'Two entries both named document.md.',
    ['integrity-failure'],
    '§8.4. ZIP permits duplicates; extraction overwrites, so the entry a reader validates and '
        + 'the entry that lands on disk can differ.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'duplicate-document',
                entrypoint: 'document.md',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# first\n' },
        { name: 'document.md', data: '# second\n' },
    ],
);

invalid(
    'duplicate-asset-entry',
    'Two archive entries at assets/pixel.png differing only in case.',
    ['integrity-failure'],
    '§8.4 requires duplicate detection to be case-insensitive. On Windows and macOS the '
        + 'second entry overwrites the first during extraction, so the bytes a reader verified '
        + 'are not the bytes it later renders.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'duplicate-asset-entry',
                entrypoint: 'document.md',
                assets: [asset('pixel', 'pixel.png', 'image/png', PNG, 'inline')],
            }),
        },
        { name: 'document.md', data: '# x\n' },
        { name: 'assets/pixel.png', data: PNG },
        { name: 'assets/Pixel.PNG', data: Buffer.from('not a png at all\n', 'utf8') },
    ],
);

invalid(
    'tampered-document-checksum',
    'documentSha256 does not match document.md.',
    ['integrity-failure'],
    '§7.',
    [
        mimetypeEntry(),
        {
            name: 'mdpack.json',
            data: json({
                format: 'mdpack',
                version: VERSION,
                id: 'tampered-document-checksum',
                entrypoint: 'document.md',
                documentSha256: '0000000000000000000000000000000000000000000000000000000000000000',
                assets: [],
            }),
        },
        { name: 'document.md', data: '# x\n' },
    ],
);

invalid(
    'tampered-asset-checksum',
    'An asset whose sha256 does not match its bytes.',
    ['integrity-failure'],
    '§7: asset checksums must be verified before the asset is presented, not only the '
        + "document's.",
    (() => {
        const document = '# Tampered asset\n\n![Pixel](assets/pixel.png)\n';
        return [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'tampered-asset-checksum',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [
                        {
                            id: 'pixel',
                            path: 'assets/pixel.png',
                            mediaType: 'image/png',
                            bytes: PNG.length,
                            sha256: '1111111111111111111111111111111111111111111111111111111111111111',
                            role: 'inline',
                        },
                    ],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/pixel.png', data: PNG },
        ];
    })(),
);

invalid(
    'declared-size-lie',
    'The document entry declares an uncompressed size of 8 bytes but expands to far more.',
    ['integrity-failure'],
    '§8.3. A reader that trusts the declared size reads a truncated document and, without '
        + 'checksum verification, shows the user half a note with no warning. The '
        + 'documentSha256 in this manifest is correct for the full text.',
    (() => {
        const document = `# Declared size lie\n\n${'я'.repeat(4000)}\n`;
        return [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'declared-size-lie',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [],
                }),
            },
            { name: 'document.md', data: document, declaredSize: 8 },
        ];
    })(),
);

invalid(
    'invalid-utf8-document',
    'document.md contains a byte sequence that is not valid UTF-8.',
    ['integrity-failure'],
    '§8.8. Silently substituting U+FFFD turns a detectable error into permanent data damage '
        + 'at the next save.',
    (() => {
        const bytes = Buffer.concat([
            Buffer.from('# Broken\n\n', 'utf8'),
            Buffer.from([0xff, 0xfe, 0x41, 0xc3, 0x28]),
            Buffer.from('\n', 'utf8'),
        ]);
        return [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'invalid-utf8-document',
                    entrypoint: 'document.md',
                    assets: [],
                }),
            },
            { name: 'document.md', data: bytes },
        ];
    })(),
);

invalid(
    'compression-bomb',
    'An asset of 4 MiB of zero bytes, compressing at roughly 1000:1.',
    ['resource-limit', 'integrity-failure'],
    '§8.3. Trips the recommended 200:1 compression-ratio limit. A reader with a higher ratio '
        + 'limit may instead reject it on a size limit; either is conforming, but expanding it '
        + 'without bound is not.',
    (() => {
        const bomb = Buffer.alloc(4 * 1024 * 1024, 0);
        const document = '# Bomb\n\n[Bomb](assets/bomb.bin)\n';
        return [
            mimetypeEntry(),
            {
                name: 'mdpack.json',
                data: json({
                    format: 'mdpack',
                    version: VERSION,
                    id: 'compression-bomb',
                    entrypoint: 'document.md',
                    documentSha256: sha256(document),
                    assets: [
                        asset('bomb', 'bomb.bin', 'application/octet-stream', bomb, 'attachment'),
                    ],
                }),
            },
            { name: 'document.md', data: document },
            { name: 'assets/bomb.bin', data: bomb },
        ];
    })(),
);

// ---------------------------------------------------------------------------

writeFileSync(
    join(root, 'tests', 'expectations.json'),
    `${json({
        $comment:
            'Expected outcomes for the MDPack conformance corpus. Generated by '
            + 'tools/build-corpus.mjs; do not edit by hand. A Conforming Reader must accept every '
            + 'file under valid/ and reject every file under invalid/, reporting one of the listed '
            + 'error classes.',
        specification: '0.1.0-draft',
        errorClasses: {
            'not-an-mdpack':
                'The file is not an MDPack package: unreadable as ZIP, no manifest, or the '
                + 'manifest does not identify itself as MDPack.',
            'unsupported-version':
                'An MDPack package whose version the reader does not implement. Must be '
                + 'distinguishable from corruption so the user is told to upgrade.',
            'malformed-manifest':
                'mdpack.json is present and identifies itself as MDPack but violates a '
                + 'structural requirement.',
            'integrity-failure':
                'Package contents contradict themselves: checksum mismatch, byte-length '
                + 'mismatch, duplicate entries, truncation, or invalid UTF-8 in a text entry.',
            'security-violation':
                'The package attempts something hostile, such as path traversal or an '
                + 'encrypted entry.',
            'resource-limit': 'Decompressing the package would exceed a reader resource limit.',
        },
        valid: cases.valid,
        invalid: cases.invalid,
    })}\n`,
);

const total = cases.valid.length + cases.invalid.length;
console.log(`Wrote ${total} packages (${cases.valid.length} valid, ${cases.invalid.length} invalid).`);
