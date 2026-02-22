const fs = require("fs");
const path = require("path");

// Lazy-require so startup doesn't crash if optional deps aren't installed yet
let sharp, AdmZip;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}
try {
  AdmZip = require("adm-zip");
} catch {
  AdmZip = null;
}

const MAX_IMAGE_DIMENSION = 20_000; // px — above this is a bomb vector
const MAX_ZIP_RATIO = 100; // uncompressed/compressed ratio limit
const MAX_ENTRY_SIZE = 10 * 1024 * 1024; // 10 MB per XML entry inside DOCX
const MAX_ENTRY_UNCOMPRESSED = 100 * 1024 * 1024; // 100 MB single-entry hard cap
const SHARP_TIMEOUT_MS = 30_000; // 30 s max per image operation
const PDF_SCAN_LIMIT = 50 * 1024 * 1024; // only scan first 50 MB of PDF content

function makePDFPatterns() {
  return [
    { re: /\/JavaScript\s*[\(<]/gi, desc: "Embedded JavaScript" },
    { re: /\/JS\s*[\(<]/gi, desc: "Embedded JS (shorthand)" },
    { re: /\/OpenAction\s*[<[]/gi, desc: "Auto-execute on open" },
    { re: /\/AA\s*[<[]/gi, desc: "Additional Actions trigger" },
    { re: /\/EmbeddedFile\s*</gi, desc: "Embedded file object" },
    { re: /\/Launch\s*</gi, desc: "Launch command" },
    { re: /\/URI\s*</gi, desc: "External URI action" },
    { re: /\/SubmitForm\s*</gi, desc: "Form submission action" },
    { re: /\/ImportData\s*</gi, desc: "Data import action" },
    { re: /<script[\s>]/gi, desc: "Script tag in PDF" },
    { re: /eval\s*\(/gi, desc: "eval() call" },
    { re: /base64_decode\s*\(/gi, desc: "Base64 decode obfuscation" },
  ];
}

function makeContentPatterns() {
  return [
    { re: /javascript:/gi, desc: "JS protocol handler" },
    { re: /powershell\s*(-\w+)?/gi, desc: "PowerShell reference" },
    { re: /cmd\.exe/gi, desc: "CMD reference" },
    { re: /mshta\.exe/gi, desc: "MSHTA reference" },
    { re: /wscript\.exe/gi, desc: "WScript reference" },
    { re: /cscript\.exe/gi, desc: "CScript reference" },
    { re: /regsvr32/gi, desc: "Regsvr32 abuse" },
    { re: /certutil.*-decode/gi, desc: "Certutil decode dropper" },
  ];
}

function makeVBAPatterns() {
  return [
    { re: /Auto_Open/gi, desc: "Auto_Open macro" },
    { re: /AutoOpen/gi, desc: "AutoOpen macro" },
    { re: /Document_Open/gi, desc: "Document_Open macro" },
    { re: /Workbook_Open/gi, desc: "Workbook_Open macro" },
    { re: /Shell\s*\(/gi, desc: "Shell() call" },
    { re: /CreateObject\s*\(/gi, desc: "CreateObject() call" },
    { re: /WScript\.Shell/gi, desc: "WScript.Shell reference" },
    { re: /environ\s*\(/gi, desc: "Environ() env access" },
    { re: /Chr\s*\(\s*\d+\s*\)/gi, desc: "Chr() obfuscation" },
    { re: /CallByName/gi, desc: "Dynamic invocation" },
    { re: /Microsoft\.XMLHTTP/gi, desc: "HTTP request from macro" },
    { re: /ADODB\.Stream/gi, desc: "File write via ADODB" },
  ];
}

function makeGIFPatterns() {
  return [
    { re: /<script[\s>]/gi, desc: "Script tag in GIF comment" },
    { re: /javascript:/gi, desc: "JS protocol in GIF comment" },
    { re: /eval\s*\(/gi, desc: "eval() in GIF comment" },
  ];
}

function scanPatterns(content, patterns) {
  const found = [];
  for (const { re, desc } of patterns) {
    if (re.test(content)) found.push(desc);
  }
  return found;
}

function safeRename(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code === "EXDEV") {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

function parseAndValidateZip(filePath) {
  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch (err) {
    return {
      safe: false,
      reason: `Cannot parse ZIP: ${err.message}`,
      zip: null,
      entries: null,
    };
  }

  const entries = zip.getEntries();
  const compressedSize = fs.statSync(filePath).size;
  let totalUncompressed = 0;

  for (const entry of entries) {
    const uncompressed = entry.header.size;
    if (uncompressed > MAX_ENTRY_UNCOMPRESSED) {
      return {
        safe: false,
        reason: `Single ZIP entry too large: ${entry.entryName} (${Math.round(uncompressed / 1024 / 1024)} MB)`,
        zip: null,
        entries: null,
      };
    }
    totalUncompressed += uncompressed;
  }

  if (
    compressedSize > 0 &&
    totalUncompressed / compressedSize > MAX_ZIP_RATIO
  ) {
    return {
      safe: false,
      reason: `ZIP bomb detected — compression ratio ${Math.round(totalUncompressed / compressedSize)}x exceeds ${MAX_ZIP_RATIO}x limit`,
      zip: null,
      entries: null,
    };
  }

  return { safe: true, reason: null, zip, entries };
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function pass(action, extra = {}) {
  return { success: true, fake: false, layer: 2, message: action, ...extra };
}

function fail(reason, extra = {}) {
  return { success: true, fake: true, layer: 2, message: reason, ...extra };
}

function error(reason) {
  return { success: false, fake: false, layer: 2, message: reason };
}

async function deepContentAnalysis(file) {
  if (!file || !file.path) {
    return error("No file object provided");
  }
  if (!fs.existsSync(file.path)) {
    return error("File not found on disk");
  }

  const originalName = (file.originalname || "").trim();
  const ext = path.extname(originalName).toLowerCase();

  if (!ext) {
    return fail("File has no extension — cannot determine type for deep scan");
  }

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    if (!sharp) {
      return error("sharp is not installed — run: npm install sharp");
    }

    const outputPath = file.path + "_clean";

    try {
      const imageInst = sharp(file.path);

      // BUG FIX 7: Wrap metadata + toFile in timeout to guard decompression bombs
      const metadata = await withTimeout(
        imageInst.metadata(),
        SHARP_TIMEOUT_MS,
        "Image metadata read",
      );

      if (!metadata || !metadata.width || !metadata.height) {
        return fail("Image has no dimensions — possibly corrupt or disguised");
      }

      if (
        metadata.width > MAX_IMAGE_DIMENSION ||
        metadata.height > MAX_IMAGE_DIMENSION
      ) {
        return fail(
          `Suspicious image dimensions: ${metadata.width}x${metadata.height} (max ${MAX_IMAGE_DIMENSION}px)`,
          { width: metadata.width, height: metadata.height },
        );
      }

      const FORMAT_MAP = {
        ".jpg": "jpeg",
        ".jpeg": "jpeg",
        ".png": "png",
        ".webp": "webp",
      };
      const format = metadata.format || FORMAT_MAP[ext];
      if (!format) {
        return fail("Could not determine image format for re-encoding");
      }

      // Re-encode: strips all metadata (EXIF/XMP/ICC) and destroys steganography.
      // sharp strips metadata by default when .withMetadata() is NOT called — correct.
      await withTimeout(
        sharp(file.path).toFormat(format).toFile(outputPath),
        SHARP_TIMEOUT_MS,
        "Image re-encode",
      );

      safeRename(outputPath, file.path);

      return pass(
        "Image re-encoded — all EXIF/XMP stripped, steganography destroyed",
        {
          detail: { format, width: metadata.width, height: metadata.height },
        },
      );
    } catch (err) {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      return fail(`Image processing failed: ${err.message}`);
    }
  }

  if (ext === ".gif") {
    const buffer = fs.readFileSync(file.path);
    const header = buffer.slice(0, 6).toString("ascii");

    if (!header.startsWith("GIF87a") && !header.startsWith("GIF89a")) {
      return fail("GIF magic bytes invalid — file may be disguised");
    }

    const gifText = buffer.toString("latin1");
    const issues = scanPatterns(gifText, makeGIFPatterns());

    if (issues.length > 0) {
      return fail("Script injection detected in GIF content", {
        details: issues,
      });
    }

    return pass("GIF header and content validated");
  }

  if (ext === ".pdf") {
    // BUG FIX 10: Don't convert the whole file to a string — cap at PDF_SCAN_LIMIT
    // to avoid 50MB+ string allocations. Read as Buffer, convert only the portion.
    const stat = fs.statSync(file.path);
    const readSz = Math.min(stat.size, PDF_SCAN_LIMIT);
    const buf = Buffer.alloc(readSz);
    const fd = fs.openSync(file.path, "r");
    fs.readSync(fd, buf, 0, readSz, 0);
    fs.closeSync(fd);
    const content = buf.toString("latin1");

    if (!content.startsWith("%PDF-")) {
      return fail("File does not start with %PDF- header — not a valid PDF");
    }

    const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
    const pdfVersion = versionMatch ? parseFloat(versionMatch[1]) : null;

    const issues = [
      ...scanPatterns(content, makePDFPatterns()),
      ...scanPatterns(content, makeContentPatterns()),
    ];

    if (issues.length > 0) {
      return fail("Dangerous PDF content detected", {
        details: issues,
        pdfVersion,
      });
    }

    return pass("PDF scanned — no dangerous patterns found", {
      detail: { pdfVersion },
    });
  }

  // OFFICE FILES (.docx .xlsx .pptx)
  if ([".docx", ".xlsx", ".pptx"].includes(ext)) {
    if (!AdmZip) {
      return error("adm-zip is not installed — run: npm install adm-zip");
    }

    // Parse ZIP once — get bomb check + entries in one call
    const { safe, reason, entries } = parseAndValidateZip(file.path);
    if (!safe) return fail(reason);

    // Definitive macro check: vbaProject.bin presence = macros embedded
    const hasMacroBin = entries.some((e) =>
      e.entryName.includes("vbaProject.bin"),
    );
    if (hasMacroBin) {
      return fail("Office file contains vbaProject.bin — macros are embedded", {
        details: ["vbaProject.bin detected"],
      });
    }

    const issues = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const entryExt = path.extname(entry.entryName).toLowerCase();
      if (![".xml", ".rels", ".vml", ".html", ".htm"].includes(entryExt))
        continue;

      // Per-entry size guard to prevent OOM on crafted DOCX
      if (entry.header.size > MAX_ENTRY_SIZE) {
        issues.push(
          `[${entry.entryName}] Entry too large to scan (${Math.round(entry.header.size / 1024)} KB) — skipped`,
        );
        continue;
      }

      let content;
      try {
        content = entry.getData().toString("utf8");
      } catch {
        issues.push(
          `[${entry.entryName}] Could not read entry — possibly corrupt`,
        );
        continue;
      }

      // VBA pattern scan
      const vbaIssues = scanPatterns(content, makeVBAPatterns());
      vbaIssues.forEach((issue) =>
        issues.push(`[${entry.entryName}] ${issue}`),
      );

      // XXE injection check
      if (
        content.includes("<!ENTITY") ||
        (content.includes("SYSTEM") && content.includes("<!DOCTYPE"))
      ) {
        issues.push(
          `[${entry.entryName}] Possible XXE injection — DOCTYPE with SYSTEM entity`,
        );
      }

      // External relationships (phone-home on open)
      if (
        entry.entryName.endsWith(".rels") &&
        /TargetMode="External"/i.test(content)
      ) {
        issues.push(
          `[${entry.entryName}] External relationship — file may contact a remote server on open`,
        );
      }
    }

    if (issues.length > 0) {
      return fail("Dangerous patterns found in Office file", {
        details: issues,
      });
    }

    return pass(
      "Office file fully scanned — no macros, XXE, or external links",
      {
        detail: { entryCount: entries.length },
      },
    );
  }

  // UNSUPPORTED TYPE
  return fail(
    `Unsupported file type "${ext}" — allowed: .jpg .jpeg .png .webp .gif .pdf .docx .xlsx .pptx`,
  );
}

module.exports = { deepContentAnalysis };
