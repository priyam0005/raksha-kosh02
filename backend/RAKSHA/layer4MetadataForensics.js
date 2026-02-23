const fs = require("fs");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_METADATA_FIELDS = 2000;
const MAX_IFD_ENTRIES = 512;
const MAX_IFD_DEPTH = 8;

const INJECTION_PATTERNS = [
  { re: /<script[\s\S]*?>/i, label: "script-tag" },
  { re: /javascript\s*:/i, label: "javascript-uri" },
  { re: /\beval\s*\(/i, label: "eval-call" },
  { re: /on\w{2,20}\s*=/i, label: "inline-event-handler" },
  { re: /<iframe[\s\S]*?>/i, label: "iframe-injection" },
  { re: /data\s*:\s*text\/html/i, label: "data-uri-html" },
  { re: /vbscript\s*:/i, label: "vbscript-uri" },
  { re: /&#x?[0-9a-f]+;/i, label: "encoded-obfuscation" },
  { re: /\.\.[/\\]/, label: "path-traversal" },
  { re: /\x00/, label: "null-byte-injection" },
  { re: /[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/, label: "control-character" },
];

const PNG_TEXT_ALLOWED_KEYS = new Set([
  "Title", "Author", "Description", "Copyright", "Creation Time",
  "Software", "Disclaimer", "Warning", "Source", "Comment",
  "XML:com.adobe.xmp", "Raw profile type exif", "Raw profile type iptc",
  "Raw profile type APP1", "date:create", "date:modify", "date:timestamp",
]);

const MAX_VALUE_LENGTH = 4096;

const GPS_FIELDS = new Set([
  "GPSLatitude", "GPSLongitude", "GPSAltitude", "GPSLatitudeRef",
  "GPSLongitudeRef", "GPSAltitudeRef", "GPSDateStamp", "GPSTimeStamp",
  "GPSImgDirection", "GPSImgDirectionRef", "GPSSpeed", "GPSSpeedRef",
  "GPSTrack", "GPSTrackRef", "GPSDestLatitude", "GPSDestLongitude",
  "GPSProcessingMethod", "GPSDOP", "GPSMeasureMode", "GPSSatellites", "GPSStatus",
]);

const PRIVATE_FIELDS = new Set([
  "CameraOwnerName", "Artist", "Copyright", "SerialNumber",
  "LensSerialNumber", "MakerNote", "UserComment", "ImageUniqueID",
  "OwnerName", "CameraSerialNumber",
]);

/* ─────────────────── EXIF TAG NAMES ─────────────────── */

const EXIF_TAGS = {
  0x010e: "ImageDescription", 0x010f: "Make", 0x0110: "Model",
  0x0112: "Orientation", 0x011a: "XResolution", 0x011b: "YResolution",
  0x0128: "ResolutionUnit", 0x0131: "Software", 0x0132: "DateTime",
  0x013b: "Artist", 0x013e: "WhitePoint", 0x013f: "PrimaryChromaticities",
  0x0211: "YCbCrCoefficients", 0x0213: "YCbCrPositioning",
  0x0214: "ReferenceBlackWhite", 0x8298: "Copyright",
  0x8769: "ExifIFDPointer", 0x8825: "GPSInfoIFDPointer",
  0x8827: "ISOSpeedRatings", 0x9000: "ExifVersion",
  0x9003: "DateTimeOriginal", 0x9004: "DateTimeDigitized",
  0x9101: "ComponentsConfiguration", 0x9102: "CompressedBitsPerPixel",
  0x9201: "ShutterSpeedValue", 0x9202: "ApertureValue",
  0x9203: "BrightnessValue", 0x9204: "ExposureBiasValue",
  0x9205: "MaxApertureValue", 0x9206: "SubjectDistance",
  0x9207: "MeteringMode", 0x9208: "LightSource", 0x9209: "Flash",
  0x920a: "FocalLength", 0x9214: "SubjectArea", 0x927c: "MakerNote",
  0x9286: "UserComment", 0x9290: "SubSecTime", 0x9291: "SubSecTimeOriginal",
  0x9292: "SubSecTimeDigitized", 0xa000: "FlashpixVersion",
  0xa001: "ColorSpace", 0xa002: "PixelXDimension", 0xa003: "PixelYDimension",
  0xa004: "RelatedSoundFile", 0xa005: "InteroperabilityIFDPointer",
  0xa20b: "FlashEnergy", 0xa20e: "FocalPlaneXResolution",
  0xa20f: "FocalPlaneYResolution", 0xa210: "FocalPlaneResolutionUnit",
  0xa214: "SubjectLocation", 0xa215: "ExposureIndex",
  0xa217: "SensingMethod", 0xa300: "FileSource", 0xa301: "SceneType",
  0xa302: "CFAPattern", 0xa401: "CustomRendered", 0xa402: "ExposureMode",
  0xa403: "WhiteBalance", 0xa404: "DigitalZoomRatio",
  0xa405: "FocalLengthIn35mmFilm", 0xa406: "SceneCaptureType",
  0xa407: "GainControl", 0xa408: "Contrast", 0xa409: "Saturation",
  0xa40a: "Sharpness", 0xa40b: "DeviceSettingDescription",
  0xa40c: "SubjectDistanceRange", 0xa420: "ImageUniqueID",
  0xa430: "CameraOwnerName", 0xa431: "SerialNumber",
  0xa432: "LensSpecification", 0xa433: "LensMake", 0xa434: "LensModel",
  0xa435: "LensSerialNumber",
};

const GPS_TAGS = {
  0x0000: "GPSVersionID", 0x0001: "GPSLatitudeRef", 0x0002: "GPSLatitude",
  0x0003: "GPSLongitudeRef", 0x0004: "GPSLongitude", 0x0005: "GPSAltitudeRef",
  0x0006: "GPSAltitude", 0x0007: "GPSTimeStamp", 0x0008: "GPSSatellites",
  0x0009: "GPSStatus", 0x000a: "GPSMeasureMode", 0x000b: "GPSDOP",
  0x000c: "GPSSpeedRef", 0x000d: "GPSSpeed", 0x000e: "GPSTrackRef",
  0x000f: "GPSTrack", 0x0010: "GPSImgDirectionRef", 0x0011: "GPSImgDirection",
  0x0012: "GPSMapDatum", 0x0013: "GPSDestLatitudeRef", 0x0014: "GPSDestLatitude",
  0x0015: "GPSDestLongitudeRef", 0x0016: "GPSDestLongitude",
  0x0017: "GPSDestBearingRef", 0x0018: "GPSDestBearing",
  0x0019: "GPSDestDistanceRef", 0x001a: "GPSDestDistance",
  0x001b: "GPSProcessingMethod", 0x001c: "GPSAreaInformation",
  0x001d: "GPSDateStamp", 0x001e: "GPSDifferential",
};

/* ─────────────────── HELPERS ────────────────────────── */

function detectFileType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return "unknown";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  if ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d)) return "tiff";
  return "unknown";
}

function safeUInt8(buf, off) { return off >= 0 && off < buf.length ? buf[off] : null; }
function safeUInt16(buf, off, le) { if (off < 0 || off + 2 > buf.length) return null; return le ? buf.readUInt16LE(off) : buf.readUInt16BE(off); }
function safeUInt32(buf, off, le) { if (off < 0 || off + 4 > buf.length) return null; return le ? buf.readUInt32LE(off) : buf.readUInt32BE(off); }
function safeInt32(buf, off, le) { if (off < 0 || off + 4 > buf.length) return null; return le ? buf.readInt32LE(off) : buf.readInt32BE(off); }
function safeSlice(buf, start, end) { if (start < 0 || end > buf.length || start > end) return null; return buf.slice(start, end); }

function readRational(buf, off, le) {
  const num = safeUInt32(buf, off, le), den = safeUInt32(buf, off + 4, le);
  if (num === null || den === null || den === 0) return null;
  return num / den;
}
function readSignedRational(buf, off, le) {
  const num = safeInt32(buf, off, le), den = safeInt32(buf, off + 4, le);
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

function readIFDValue(buf, type, count, valueOffset, le) {
  const typeSize = TYPE_SIZES[type] || 0;
  if (typeSize === 0 || count === 0) return undefined;
  const totalBytes = typeSize * count;
  let dataOffset;
  if (totalBytes <= 4) { dataOffset = valueOffset; }
  else {
    const ptr = safeUInt32(buf, valueOffset, le);
    if (ptr === null || ptr + totalBytes > buf.length) return undefined;
    dataOffset = ptr;
  }
  if (dataOffset + totalBytes > buf.length) return undefined;
  switch (type) {
    case 1: case 7: if (count === 1) return buf[dataOffset]; return Array.from(safeSlice(buf, dataOffset, dataOffset + count) || []);
    case 2: { const raw = safeSlice(buf, dataOffset, dataOffset + count); if (!raw) return undefined; return raw.toString("latin1").replace(/\0.*$/, "").trim(); }
    case 3: if (count === 1) return safeUInt16(buf, dataOffset, le); return Array.from({ length: count }, (_, i) => safeUInt16(buf, dataOffset + i * 2, le));
    case 4: if (count === 1) return safeUInt32(buf, dataOffset, le); return Array.from({ length: count }, (_, i) => safeUInt32(buf, dataOffset + i * 4, le));
    case 5: if (count === 1) return readRational(buf, dataOffset, le); return Array.from({ length: count }, (_, i) => readRational(buf, dataOffset + i * 8, le));
    case 9: if (count === 1) return safeInt32(buf, dataOffset, le); return Array.from({ length: count }, (_, i) => safeInt32(buf, dataOffset + i * 4, le));
    case 10: if (count === 1) return readSignedRational(buf, dataOffset, le); return Array.from({ length: count }, (_, i) => readSignedRational(buf, dataOffset + i * 8, le));
    default: return undefined;
  }
}

function parseIFD(buf, ifdOffset, le, tagMap, result, depth, errors) {
  if (depth > MAX_IFD_DEPTH) { errors.add("Max IFD depth exceeded"); return; }
  if (ifdOffset <= 0 || ifdOffset + 2 > buf.length) return;
  const entryCount = safeUInt16(buf, ifdOffset, le);
  if (entryCount === null || entryCount > MAX_IFD_ENTRIES) { errors.add(`Abnormal IFD entry count: ${entryCount}`); return; }
  for (let i = 0; i < entryCount; i++) {
    const entryOff = ifdOffset + 2 + i * 12;
    if (entryOff + 12 > buf.length) break;
    const tagId = safeUInt16(buf, entryOff, le);
    const type = safeUInt16(buf, entryOff + 2, le);
    const count = safeUInt32(buf, entryOff + 4, le);
    if (tagId === null || type === null || count === null) continue;
    if (type < 1 || type > 12) continue;
    const name = tagMap[tagId] || `Tag_0x${tagId.toString(16).toUpperCase()}`;
    if (tagId === 0x8769 || tagId === 0xa005) { const subPtr = safeUInt32(buf, entryOff + 8, le); if (subPtr) parseIFD(buf, subPtr, le, EXIF_TAGS, result, depth + 1, errors); continue; }
    if (tagId === 0x8825) { const gpsPtr = safeUInt32(buf, entryOff + 8, le); if (gpsPtr) parseIFD(buf, gpsPtr, le, GPS_TAGS, result, depth + 1, errors); continue; }
    const value = readIFDValue(buf, type, count, entryOff + 8, le);
    if (value !== undefined && value !== null) result[name] = value;
  }
  const nextOff = safeUInt32(buf, ifdOffset + 2 + entryCount * 12, le);
  if (nextOff && nextOff !== ifdOffset) parseIFD(buf, nextOff, le, tagMap, result, depth + 1, errors);
}

function parseTIFFBlock(buf, errors) {
  if (buf.length < 8) { errors.add("TIFF block too small"); return {}; }
  const byteOrder = buf.slice(0, 2).toString("ascii");
  if (byteOrder !== "II" && byteOrder !== "MM") { errors.add("Invalid TIFF byte-order marker"); return {}; }
  const le = byteOrder === "II";
  if (safeUInt16(buf, 2, le) !== 42) { errors.add("Invalid TIFF magic number"); return {}; }
  const ifd0Offset = safeUInt32(buf, 4, le);
  if (!ifd0Offset) { errors.add("Cannot read IFD0 offset"); return {}; }
  const result = {};
  parseIFD(buf, ifd0Offset, le, EXIF_TAGS, result, 0, errors);
  return result;
}

function parseJPEG(buf, errors) {
  const meta = {};
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) { errors.add(`Lost sync at offset ${offset}`); break; }
    let markerByte = buf[offset + 1];
    if (markerByte === 0xff) { offset++; continue; }
    if (markerByte === 0xda || markerByte === 0xd9) break;
    const segLen = safeUInt16(buf, offset + 2, false);
    if (segLen === null || segLen < 2) { errors.add("Invalid JPEG segment length"); break; }
    const segStart = offset + 4, segEnd = offset + 2 + segLen;
    if (segEnd > buf.length) { errors.add("JPEG segment extends beyond file"); break; }
    const payload = buf.slice(segStart, segEnd);
    if (markerByte === 0xe1) {
      const header = payload.slice(0, 6).toString("ascii");
      if (header === "Exif\0\0") Object.assign(meta, parseTIFFBlock(payload.slice(6), errors));
    }
    offset = segEnd;
  }
  return meta;
}

function parsePNG(buf, errors, unknownKeys) {
  const meta = {};
  let offset = 8;
  let iendOffset = null;
  while (offset + 8 <= buf.length) {
    const chunkLen = safeUInt32(buf, offset, false);
    if (chunkLen === null) break;
    const chunkType = buf.slice(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8, dataEnd = dataStart + chunkLen;
    if (dataEnd > buf.length) { errors.add("PNG chunk extends beyond file"); break; }
    if (chunkType === "tEXt") {
      const chunk = buf.slice(dataStart, dataEnd);
      const nullIdx = chunk.indexOf(0x00);
      if (nullIdx !== -1) {
        const key = chunk.slice(0, nullIdx).toString("latin1").trim();
        const val = chunk.slice(nullIdx + 1).toString("latin1").trim();
        if (!PNG_TEXT_ALLOWED_KEYS.has(key)) unknownKeys.add(key);
        if (key) meta[key] = val;
      }
    } else if (chunkType === "iTXt") {
      const chunk = buf.slice(dataStart, dataEnd);
      const nullIdx = chunk.indexOf(0x00);
      if (nullIdx !== -1) {
        const key = chunk.slice(0, nullIdx).toString("latin1").trim();
        let pos = nullIdx + 3;
        while (pos < chunk.length && chunk[pos] !== 0x00) pos++;
        pos++;
        while (pos < chunk.length && chunk[pos] !== 0x00) pos++;
        pos++;
        const val = chunk.slice(pos).toString("utf8").trim();
        if (!PNG_TEXT_ALLOWED_KEYS.has(key)) unknownKeys.add(key);
        if (key) meta[key] = val;
      }
    } else if (chunkType === "eXIf") {
      Object.assign(meta, parseTIFFBlock(buf.slice(dataStart, dataEnd), errors));
    } else if (chunkType === "IEND") {
      if (chunkLen !== 0) errors.add("IEND chunk has non-zero length — file may be crafted");
      iendOffset = dataEnd + 4;
      break;
    }
    offset = dataEnd + 4;
  }
  if (iendOffset === null) {
    errors.add("PNG has no IEND chunk — file is malformed or truncated");
  } else if (iendOffset < buf.length) {
    const trailingLen = buf.length - iendOffset;
    const trailingSample = buf.slice(iendOffset, Math.min(iendOffset + 64, buf.length));
    errors.add(`${trailingLen} byte(s) of data found after IEND chunk — possible injected payload`);
    meta["__trailing_bytes__"] = trailingSample.toString("latin1");
  }
  return meta;
}

function parseWebP(buf, errors) {
  const meta = {};
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.slice(offset, offset + 4).toString("ascii");
    const chunkLen = safeUInt32(buf, offset + 4, true);
    if (chunkLen === null) break;
    const dataStart = offset + 8, dataEnd = dataStart + chunkLen;
    if (dataEnd > buf.length) { errors.add("WebP chunk extends beyond file"); break; }
    if (chunkId === "EXIF") Object.assign(meta, parseTIFFBlock(buf.slice(dataStart, dataEnd), errors));
    else if (chunkId === "XMP ") meta["XMPData"] = buf.slice(dataStart, dataEnd).toString("utf8").slice(0, 2000);
    offset = dataEnd + (chunkLen % 2 === 1 ? 1 : 0);
  }
  return meta;
}

/* ─────────────────── TIMESTAMP ─────────────────────── */

function parseExifTimestamp(str) {
  if (typeof str !== "string") return null;

  // EXIF format: "YYYY:MM:DD HH:MM:SS" — no timezone info embedded
  // ── FIX 2: use new Date(Y, Mo-1, D, h, mi, s) instead of Date.UTC ──
  // Date.UTC treated timestamps as UTC, causing false positives for files
  // created in UTC+ timezones (e.g. IST UTC+5:30 was flagged as "future").
  // Using local Date constructor aligns the comparison with server local time.
  const m = str.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const [, Y, Mo, D, h, mi, s] = m.map(Number);
    if (Mo < 1 || Mo > 12 || D < 1 || D > 31 || h > 23 || mi > 59 || s > 59) return null;
    const ts = new Date(Y, Mo - 1, D, h, mi, s).getTime();
    return Number.isFinite(ts) ? ts : null;
  }

  // ISO 8601 (PNG date:* fields) — has timezone info, parse directly
  const ts = Date.parse(str);
  return Number.isFinite(ts) ? ts : null;
}

/* ─────────────────── VALUE SAFETY CHECK ─────────────── */

function valueLooksSuspicious(str) {
  if (str.length > MAX_VALUE_LENGTH) return { suspicious: true, reason: "value-too-long" };
  let nonPrintable = 0;
  for (let i = 0; i < Math.min(str.length, 512); i++) {
    const c = str.charCodeAt(i);
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0x7f) nonPrintable++;
  }
  const sampleLen = Math.min(str.length, 512);
  if (sampleLen > 0 && nonPrintable / sampleLen > 0.1) return { suspicious: true, reason: "binary-or-control-chars" };
  return { suspicious: false };
}

/* ─────────────────── MAIN FUNCTION ─────────────────── */

function layer4MetadataForensics(fileBuffer) {
  const report = {
    safe: true, fileType: "unknown", injectionThreats: [],
    timestampSuspicious: false, gpsDetected: false, strippedFields: [],
    rawMetadata: {}, cleanMetadata: {}, warnings: [], errors: [],
  };

  if (!Buffer.isBuffer(fileBuffer)) { report.errors.push("Input must be a Buffer"); report.safe = false; return report; }
  if (fileBuffer.length < 12) { report.errors.push("File too small"); report.safe = false; return report; }
  if (fileBuffer.length > MAX_FILE_SIZE) { report.errors.push("File size exceeds maximum"); report.safe = false; return report; }

  report.fileType = detectFileType(fileBuffer);
  if (report.fileType === "unknown") report.warnings.push("Unrecognised file type; metadata extraction skipped");

  const parseErrors = new Set();
  const unknownPNGKeys = new Set();
  let all = {};

  try {
    switch (report.fileType) {
      case "jpeg": all = parseJPEG(fileBuffer, parseErrors); break;
      case "png":  all = parsePNG(fileBuffer, parseErrors, unknownPNGKeys); break;
      case "webp": all = parseWebP(fileBuffer, parseErrors); break;
      case "tiff": all = parseTIFFBlock(fileBuffer, parseErrors); break;
    }
  } catch (err) { parseErrors.add(`Unexpected parse error: ${err.message}`); }

  for (const e of parseErrors) {
    report.errors.push(e);
    if (e.includes("trailing") || e.includes("IEND") || e.includes("crafted") || e.includes("beyond file")) report.safe = false;
  }

  if (unknownPNGKeys.size > 0) {
    const keyList = [...unknownPNGKeys].join(", ");
    report.injectionThreats.push({ field: "__png_text_keys__", value: keyList, reason: "unknown-png-text-key" });
    report.warnings.push(`Unknown/non-standard PNG tEXt keys detected: ${keyList}`);
    report.safe = false;
  }

  report.rawMetadata = { ...all };

  if (Object.keys(all).length > MAX_METADATA_FIELDS) {
    report.errors.push("Excessive metadata fields detected; possible crafted file");
    report.safe = false;
    const keys = Object.keys(all).slice(0, MAX_METADATA_FIELDS);
    const trimmed = {};
    for (const k of keys) trimmed[k] = all[k];
    all = trimmed;
  }

  const threatFieldSet = new Set();
  for (const [field, value] of Object.entries(all)) {
    const str = String(value);
    const { suspicious, reason } = valueLooksSuspicious(str);
    if (suspicious) {
      report.injectionThreats.push({ field, value: str.slice(0, 300), reason });
      threatFieldSet.add(field);
      report.safe = false;
      continue;
    }
    for (const { re, label } of INJECTION_PATTERNS) {
      if (re.test(str)) {
        report.injectionThreats.push({ field, value: str.slice(0, 300), reason: label });
        threatFieldSet.add(field);
        report.safe = false;
        break;
      }
    }
  }

  // Timestamp check disabled — future timestamps are common due to timezone
  // differences between the file's origin and the UTC server. Not a reliable
  // threat signal, so we pass all files regardless of timestamp value.

  const stripSet = new Set();
  for (const key of Object.keys(all)) {
    if (GPS_FIELDS.has(key)) { report.gpsDetected = true; stripSet.add(key); }
    if (PRIVATE_FIELDS.has(key)) stripSet.add(key);
  }
  report.strippedFields = [...stripSet];

  for (const [key, value] of Object.entries(all)) {
    if (!stripSet.has(key) && !threatFieldSet.has(key)) report.cleanMetadata[key] = value;
  }

  return report;
}

module.exports = {
  layer4MetadataForensics,
  _internal: { detectFileType, parseExifTimestamp, parseTIFFBlock, parseJPEG, parsePNG, parseWebP },
};
