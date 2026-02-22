// layers/magic-number.js
// layers/magic-number.js
// layers/magic-number.js
const fs = require("fs");

const MAGIC_NUMBERS = {
  FFD8FF: "image/jpeg",
  "89504E47": "image/png",
  25504446: "application/pdf", // ← quoted string (was numeric literal — bug!)
  "504B0304": "application/zip",
  52494646: "image/webp", // ← quoted string (was numeric literal — bug!)
  47494638: "image/gif", // ← quoted string (was numeric literal — bug!)
};

const DANGEROUS_SIGNATURES = [
  "4D5A", // MZ header = Windows EXE
  "7F454C46", // ELF = Linux executable
  "FEEDFACE", // Mach-O = macOS executable
];

const ZIP_SIGNATURE = "504B0304";

const ZIP_MIME_TYPES = [
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

// MIME types we know and can verify against magic bytes.
// If a file is declared as one of these but the bytes don't match → it's fake.
const VERIFIABLE_MIME_TYPES = new Set(Object.values(MAGIC_NUMBERS));

/**
 * Reads the first 16 bytes of a file and checks its magic number.
 * @param {{ path: string, mimetype: string, originalname?: string }} file
 * @returns {{
 *   success: boolean,
 *   fake: boolean,
 *   layer: number,
 *   message: string,
 *   detectedType?: string,
 *   declaredType?: string,
 *   detectedHex?: string
 * }}
 */
async function checkMagicNumber(file) {
  // ── Input validation ────────────────────────────────────────────────────────
  if (!file || !file.path) {
    return {
      success: false,
      fake: false,
      layer: 1,
      message: "No file provided or file path is missing.",
    };
  }

  if (!fs.existsSync(file.path)) {
    return {
      success: false,
      fake: false,
      layer: 1,
      message: `File not found at path: ${file.path}`,
    };
  }

  // ── Read first 16 bytes ─────────────────────────────────────────────────────
  let hex;
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(file.path, "r");
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    hex = buffer.toString("hex").toUpperCase();
  } catch (err) {
    return {
      success: false,
      fake: false,
      layer: 1,
      message: `Failed to read file: ${err.message}`,
    };
  }

  const declaredType = file.mimetype || "";

  // ── Check for dangerous signatures ─────────────────────────────────────────
  for (const danger of DANGEROUS_SIGNATURES) {
    if (hex.startsWith(danger.toUpperCase())) {
      return {
        success: true, // server handled it — no crash
        fake: true, // but the file is dangerous/fake
        layer: 1,
        message: `Dangerous executable signature detected. File rejected.`,
        declaredType,
        detectedHex: hex.slice(0, 16),
      };
    }
  }

  // ── Detect actual type from magic bytes ─────────────────────────────────────
  let detectedType = null;
  for (const [magic, mimeType] of Object.entries(MAGIC_NUMBERS)) {
    if (hex.startsWith(magic)) {
      // keys are already uppercase strings
      detectedType = mimeType;
      break;
    }
  }

  // ── Handle ZIP-based formats (DOCX, XLSX, PPTX all share the ZIP signature) ─
  if (hex.startsWith(ZIP_SIGNATURE)) {
    if (!ZIP_MIME_TYPES.includes(declaredType)) {
      return {
        success: true,
        fake: true,
        layer: 1,
        message: `ZIP-based bytes detected but declared MIME type "${declaredType}" is not a recognised ZIP-based format. Possible disguised file.`,
        declaredType,
        detectedHex: hex.slice(0, 16),
      };
    }
    return {
      success: true,
      fake: false,
      layer: 1,
      message: "File passed security scan.",
      detectedType: declaredType,
      declaredType,
      detectedHex: hex.slice(0, 16),
    };
  }

  // ── MIME mismatch: bytes match a known type but it differs from declared ────
  if (detectedType && detectedType !== declaredType) {
    return {
      success: true,
      fake: true,
      layer: 1,
      message: `File is fake. Declared as "${declaredType}" but actual content is "${detectedType}".`,
      detectedType,
      declaredType,
      detectedHex: hex.slice(0, 16),
    };
  }

  // ── FIX: declared type is verifiable but bytes are completely unrecognised ──
  // e.g. a .txt file renamed to .pdf — bytes won't match PDF magic number
  if (!detectedType && VERIFIABLE_MIME_TYPES.has(declaredType)) {
    return {
      success: true,
      fake: true,
      layer: 1,
      message: `File is fake. Declared as "${declaredType}" but file bytes do not match any known signature for that type.`,
      detectedType: "unknown",
      declaredType,
      detectedHex: hex.slice(0, 16),
    };
  }

  // ── All checks passed ───────────────────────────────────────────────────────
  return {
    success: true,
    fake: false,
    layer: 1,
    message: "File passed security scan.",
    detectedType:
      detectedType || "unknown (unrecognised format, not dangerous)",
    declaredType,
    detectedHex: hex.slice(0, 16),
  };
}

module.exports = { checkMagicNumber };
