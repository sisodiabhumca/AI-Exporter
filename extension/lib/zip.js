/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.zip = {
  buildBlob(entries) {
    const te = new TextEncoder();
    const parts = [];
    const cdParts = [];
    let offset = 0;

    for (const entry of entries) {
      const pathBytes = te.encode(entry.path);
      const dataBytes =
        typeof entry.data === "string" ? te.encode(entry.data) : entry.data;
      const crc = this.crc32(dataBytes);

      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, dataBytes.length, true);
      lh.setUint32(22, dataBytes.length, true);
      lh.setUint16(26, pathBytes.length, true);

      parts.push(new Uint8Array(lh.buffer), pathBytes, dataBytes);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(10, 0, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, dataBytes.length, true);
      cd.setUint32(24, dataBytes.length, true);
      cd.setUint16(28, pathBytes.length, true);
      cd.setUint32(42, offset, true);

      cdParts.push(new Uint8Array(cd.buffer), pathBytes);
      offset += 30 + pathBytes.length + dataBytes.length;
    }

    const cdSize = cdParts.reduce((sum, part) => sum + part.length, 0);
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, cdSize, true);
    eocd.setUint32(16, offset, true);

    return new Blob([...parts, ...cdParts, new Uint8Array(eocd.buffer)], {
      type: "application/zip",
    });
  },

  crc32(buf) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let j = 0; j < 8; j += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  },

  downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
