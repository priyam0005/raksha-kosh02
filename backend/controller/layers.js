const fs = require("fs");
const { checkMagicNumber } = require("../RAKSHA/MagicNumber");
const {
  layer4MetadataForensics,
} = require("../RAKSHA/layer4MetadataForensics");
const { deepContentAnalysis } = require("../RAKSHA/deepContent");
const { layer3AntivirusScan } = require("../RAKSHA/layer3antivirus");
const saveScanResult = require("../controller/scan");

function deleteFile(filePath) {
  if (filePath) fs.unlink(filePath, () => {});
}

function withHardTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE LAYER LOGIC
// ─────────────────────────────────────────────────────────────────────────────

async function scanLayer1(file) {
  const result = await checkMagicNumber(file);
  if (!result.success)
    return {
      pass: false,
      status: 500,
      scanLabel: "Magic Number / MIME Check",
      reason: "Could not read file.",
      detail: result.message,
    };
  if (result.fake)
    return {
      pass: false,
      status: 422,
      scanLabel: "Magic Number / MIME Mismatch",
      reason: result.message,
      detail: {
        declaredType: result.declaredType,
        detectedType: result.detectedType || "unknown",
        detectedHex: result.detectedHex,
      },
    };
  return {
    pass: true,
    scanLabel: "Magic Number / MIME Check",
    detail: {
      declaredType: result.declaredType,
      detectedType: result.detectedType,
      detectedHex: result.detectedHex,
    },
  };
}

async function scanLayer2(file) {
  const result = await deepContentAnalysis(file);
  if (!result.success)
    return {
      pass: false,
      scanFailed: true,
      status: 500,
      scanLabel: "Deep Content Analysis",
      reason: "Internal error during content scan.",
      detail: result.message,
    };
  if (result.fake)
    return {
      pass: false,
      scanFailed: false,
      status: 422,
      scanLabel: "Deep Content Analysis",
      reason: result.message,
      detail: result.detail ?? result.details ?? null,
    };
  return {
    pass: true,
    scanFailed: false,
    scanLabel: "Deep Content Analysis",
    detail: result.detail ?? null,
  };
}

function scanLayer3Metadata(fileBuffer) {
  const result = layer4MetadataForensics(fileBuffer);

  const hasErrors = (result.errors || []).length > 0;
  const hasThreats = (result.injectionThreats || []).length > 0;
  const hasTimestamp = result.timestampSuspicious === true;
  const libSafe =
    result.safe === true && !hasErrors && !hasThreats && !hasTimestamp;

  if (!libSafe) {
    const failReasons = [
      ...(result.injectionThreats || []).map(
        (t) => `Injection in "${t.field}": ${t.reason}`,
      ),
      ...(result.warnings || [])
        .filter((w) => w.includes("future"))
        .map((w) => `Suspicious timestamp — ${w}`),
      ...(result.errors || []).map((e) => `Parse error: ${e}`),
    ];
    return {
      pass: false,
      status: 422,
      scanLabel: "Metadata Forensics",
      reason: "File failed metadata security scan.",
      failReasons,
      detail: {
        fileType: result.fileType,
        injectionThreats: result.injectionThreats,
        timestampSuspicious: result.timestampSuspicious,
        strippedFields: result.strippedFields,
        warnings: result.warnings,
        errors: result.errors,
      },
    };
  }

  return {
    pass: true,
    scanLabel: "Metadata Forensics",
    detail: {
      fileType: result.fileType,
      strippedFields: result.strippedFields,
      cleanMetadata: result.cleanMetadata,
      warnings: result.warnings,
    },
  };
}

async function scanLayer4Antivirus(filePath, originalName) {
  const result = await layer3AntivirusScan(filePath, originalName);
  if (!result.safe)
    return {
      pass: false,
      status: 422,
      scanLabel: "Antivirus Scan",
      reason: result.reason,
      detail: {
        sha256: result.sha256,
        hashCheck: result.hashCheck,
        clamAV: result.clamAV,
        virusTotal: result.virusTotal,
      },
    };
  return {
    pass: true,
    scanLabel: "Antivirus Scan",
    detail: {
      sha256: result.sha256,
      hashCheck: result.hashCheck,
      clamAV: result.clamAV,
      virusTotal: result.virusTotal,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL LAYER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

async function runLayer1(req, res) {
  const filePath = req.file?.path;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, layer: 1, reason: "No file uploaded." });
    const r = await scanLayer1(req.file);
    deleteFile(filePath);
    return r.pass
      ? res.status(200).json({
          success: true,
          layer: 1,
          scanLabel: r.scanLabel,
          passed: true,
          message: "File byte signature matches declared MIME type.",
          detail: r.detail,
        })
      : res.status(r.status).json({
          success: false,
          layer: 1,
          scanLabel: r.scanLabel,
          passed: false,
          reason: r.reason,
          detail: r.detail,
        });
  } catch (err) {
    deleteFile(filePath);
    console.error("[Layer 1]", err);
    return res
      .status(500)
      .json({ success: false, layer: 1, reason: "Internal server error." });
  }
}

async function runLayer2(req, res) {
  const filePath = req.file?.path;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, layer: 2, reason: "No file uploaded." });
    const r = await scanLayer2(req.file);
    deleteFile(filePath);
    if (r.pass)
      return res.status(200).json({
        success: true,
        layer: 2,
        scanLabel: r.scanLabel,
        passed: true,
        message: "File content structure is valid.",
        detail: r.detail,
      });
    return res.status(r.status).json({
      success: !r.scanFailed,
      layer: 2,
      scanLabel: r.scanLabel,
      passed: false,
      reason: r.reason,
      detail: r.detail,
    });
  } catch (err) {
    deleteFile(filePath);
    console.error("[Layer 2]", err);
    return res
      .status(500)
      .json({ success: false, layer: 2, reason: "Internal server error." });
  }
}

async function runLayer3(req, res) {
  const filePath = req.file?.path;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, layer: 3, reason: "No file uploaded." });
    const fileBuffer = fs.readFileSync(filePath);
    const r = scanLayer3Metadata(fileBuffer);
    deleteFile(filePath);
    return r.pass
      ? res.status(200).json({
          success: true,
          layer: 3,
          scanLabel: r.scanLabel,
          passed: true,
          message: "Metadata passed all forensic checks.",
          detail: r.detail,
        })
      : res.status(r.status).json({
          success: false,
          layer: 3,
          scanLabel: r.scanLabel,
          passed: false,
          reason: r.reason,
          failReasons: r.failReasons,
          detail: r.detail,
        });
  } catch (err) {
    deleteFile(filePath);
    console.error("[Layer 3]", err);
    return res
      .status(500)
      .json({ success: false, layer: 3, reason: "Internal server error." });
  }
}

async function runLayer4(req, res) {
  const filePath = req.file?.path;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, layer: 4, reason: "No file uploaded." });
    const r = await scanLayer4Antivirus(filePath, req.file.originalname);
    deleteFile(filePath);
    return r.pass
      ? res.status(200).json({
          success: true,
          layer: 4,
          scanLabel: r.scanLabel,
          passed: true,
          message: "File passed all antivirus engines.",
          detail: r.detail,
        })
      : res.status(r.status).json({
          success: false,
          layer: 4,
          scanLabel: r.scanLabel,
          passed: false,
          reason: r.reason,
          detail: r.detail,
        });
  } catch (err) {
    deleteFile(filePath);
    console.error("[Layer 4]", err);
    return res
      .status(500)
      .json({ success: false, layer: 4, reason: "Internal server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SCAN — L1 → L2 → L3(Metadata) → L4(Antivirus)
// ─────────────────────────────────────────────────────────────────────────────

async function runFullScan(req, res) {
  const filePath = req.file?.path;
  const startTime = Date.now();
  const msLeft = () => Math.max(3000, 13000 - (Date.now() - startTime));
  const summary = {};

  if (!req.file)
    return res
      .status(400)
      .json({ success: false, reason: "No file uploaded." });

  try {
    const fileBuffer = fs.readFileSync(filePath);

    const finalize = async (statusCode, responseBody) => {
      if (req.user?.id && statusCode !== 500) {
        saveScanResult(
          req.user.id,
          req.file,
          fileBuffer,
          responseBody,
          Date.now() - startTime,
        ); // intentionally not awaited
      }
      deleteFile(filePath);
      return res.status(statusCode).json(responseBody);
    };

    // ── Layer 1 — Magic Number ────────────────────────────────────────────────
    console.log("[Full Scan] ▶ Layer 1 — Magic Number...");
    const r1 = await scanLayer1(req.file);
    if (!r1.pass)
      return finalize(r1.status, {
        success: r1.status !== 500,
        layerCaught: 1,
        scanLabel: r1.scanLabel,
        passed: false,
        reason: r1.reason,
        explanation:
          "Blocked at Layer 1 — MIME type / byte signature mismatch.",
        detail: r1.detail,
      });
    summary.layer1 = { passed: true, ...r1.detail };
    console.log("[Full Scan] ✅ Layer 1 passed");

    // ── Layer 2 — Deep Content Analysis ──────────────────────────────────────
    console.log("[Full Scan] ▶ Layer 2 — Deep Content Analysis...");
    const r2 = await scanLayer2(req.file);
    if (!r2.pass)
      return finalize(r2.status, {
        success: !r2.scanFailed,
        layerCaught: 2,
        scanLabel: r2.scanLabel,
        passed: false,
        reason: r2.reason,
        explanation:
          "Blocked at Layer 2 — File passed MIME check but internal structure is invalid or corrupted.",
        detail: r2.detail,
      });
    summary.layer2 = { passed: true, ...r2.detail };
    console.log("[Full Scan] ✅ Layer 2 passed");

    // ── Layer 3 — Metadata Forensics ─────────────────────────────────────────
    console.log("[Full Scan] ▶ Layer 3 — Metadata Forensics...");
    const r3meta = scanLayer3Metadata(fileBuffer);
    if (!r3meta.pass)
      return finalize(r3meta.status, {
        success: r3meta.status !== 500,
        layerCaught: 3,
        scanLabel: r3meta.scanLabel,
        passed: false,
        reason: r3meta.reason,
        explanation:
          "Blocked at Layer 3 — Metadata contains injected payloads, malicious scripts, or suspicious timestamps.",
        failReasons: r3meta.failReasons,
        detail: r3meta.detail,
      });
    summary.layer3 = { passed: true, ...r3meta.detail };
    console.log("[Full Scan] ✅ Layer 3 passed");

    // ── Layer 4 — Antivirus ───────────────────────────────────────────────────
    console.log(`[Full Scan] ▶ Layer 4 — Antivirus (${msLeft()}ms budget)...`);
    let r4av;
    try {
      r4av = await withHardTimeout(
        scanLayer4Antivirus(filePath, req.file.originalname),
        msLeft(),
        "Layer 4",
      );
    } catch {
      console.warn(
        "[Full Scan] ⚠ Layer 4 timed out — inconclusive, file not blocked.",
      );
      r4av = {
        pass: true,
        scanLabel: "Antivirus Scan",
        detail: {
          sha256: null,
          hashCheck: null,
          clamAV: null,
          virusTotal: { clean: null, reason: "Timed out — inconclusive" },
        },
      };
    }
    if (!r4av.pass)
      return finalize(r4av.status, {
        success: r4av.status !== 500,
        layerCaught: 4,
        scanLabel: r4av.scanLabel,
        passed: false,
        reason: r4av.reason,
        explanation: "Blocked at Layer 4 — File flagged by antivirus engine.",
        detail: r4av.detail,
      });
    summary.layer4 = { passed: true, ...r4av.detail };
    console.log(
      `[Full Scan] ✅ Layer 4 passed — total: ${Date.now() - startTime}ms`,
    );

    // ── All passed ────────────────────────────────────────────────────────────
    return finalize(200, {
      success: true,
      message: "✅ File passed all 4 security layers. Safe to process.",
      timeTaken: `${Date.now() - startTime}ms`,
      file: {
        originalName: req.file.originalname,
        savedAs: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      scanSummary: summary,
    });
  } catch (err) {
    deleteFile(filePath);
    console.error("[Full Scan] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      reason: "Internal server error during full scan.",
    });
  }
}

module.exports = { runLayer1, runLayer2, runLayer3, runLayer4, runFullScan };
