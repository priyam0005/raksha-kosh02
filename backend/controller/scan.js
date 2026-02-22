// utils/saveScan.js

const Scan = require("../schema/scanSchema");
const User = require("../schema/userSchema");
const crypto = require("crypto");

async function saveScanResult(
  userId,
  file,
  fileBuffer,
  result,
  scanDurationMs,
) {
  try {
    const md5 = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");

    const ext = file.originalname.split(".").pop().toLowerCase();

    // Build layers array from result summary
    const layerNames = {
      1: "File Signature",
      2: "Deep Content Analysis",
      3: "MetaData Forensics",
      4: "Av Engine",
    };

    // Determine which layer failed
    const failedLayerNum = result.layerCaught ?? null;

    const layers = [1, 2, 4, 3].map((num) => ({
      layer: num,
      name: layerNames[num],
      status:
        failedLayerNum === null
          ? "passed"
          : failedLayerNum === num
            ? "failed"
            : num > failedLayerNum || (failedLayerNum === 3 && num === 3)
              ? "skipped"
              : "passed",
      detail: failedLayerNum === num ? result.reason : null,
    }));

    await Scan.create({
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      fileExtension: ext,
      mimeType: file.mimetype,
      md5,
      sha256,
      sha1,
      status: result.layerCaught ? "failed" : "clean",
      failedLayer: failedLayerNum,
      failedLayerName: failedLayerNum ? layerNames[failedLayerNum] : null,
      reason: result.reason ?? null,
      explanation: result.explanation ?? null,
      failReasons: result.failReasons ?? null,
      layers,
      scanDurationMs,
    });

    // Increment user scan count atomically
    await User.findByIdAndUpdate(userId, { $inc: { totalScans: 1 } });
  } catch (err) {
    // Never crash the scan response because of a save failure
    console.error("[saveScanResult] Failed to save scan:", err.message);
  }
}

module.exports = saveScanResult;
