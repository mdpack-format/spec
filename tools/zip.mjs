// Minimal ZIP writer used to build the MDPack conformance corpus.
//
// A stock ZIP library is deliberately not used: several corpus files must be
// malformed in ways a correct library refuses to produce — duplicate entry
// names, path traversal, and uncompressed sizes that disagree with the actual
// stream. This writer therefore exposes the raw header fields.
//
// MIT licensed, see LICENSE-CODE.

import { deflateRawSync } from 'node:zlib';

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();

export function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @typedef {object} ZipEntry
 * @property {string} name              Entry path, written verbatim.
 * @property {Buffer|string} data       Entry contents.
 * @property {'store'|'deflate'} [method]
 * @property {number} [declaredSize]    Overrides the uncompressed size field. Used to
 *                                      build packages that lie about their size.
 */

/**
 * Builds a ZIP archive. Entries are written in the order given, which matters
 * for the `mimetype` entry: the specification requires it to come first.
 *
 * @param {ZipEntry[]} entries
 * @returns {Buffer}
 */
export function buildZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const entry of entries) {
        const name = Buffer.from(entry.name, 'utf8');
        const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
        const method = entry.method ?? 'deflate';
        const compressed = method === 'store' ? data : deflateRawSync(data, { level: 9 });
        const crc = crc32(data);
        const declaredSize = entry.declaredSize ?? data.length;
        // Bit 11 marks the entry name as UTF-8; harmless for pure ASCII names.
        const flags = 0x0800;

        const local = Buffer.alloc(30 + name.length);
        local.writeUInt32LE(LOCAL_SIG, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(flags, 6);
        local.writeUInt16LE(method === 'store' ? 0 : 8, 8);
        local.writeUInt16LE(0, 10);
        local.writeUInt16LE(0x2821, 12); // 2020-01-01
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(declaredSize, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        name.copy(local, 30);

        const central = Buffer.alloc(46 + name.length);
        central.writeUInt32LE(CENTRAL_SIG, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(flags, 8);
        central.writeUInt16LE(method === 'store' ? 0 : 8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0x2821, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(declaredSize, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);
        name.copy(central, 46);

        locals.push(local, compressed);
        centrals.push(central);
        offset += local.length + compressed.length;
    }

    const centralBuffer = Buffer.concat(centrals);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(EOCD_SIG, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralBuffer.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...locals, centralBuffer, eocd]);
}
