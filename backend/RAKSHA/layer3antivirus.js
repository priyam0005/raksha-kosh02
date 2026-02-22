require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// Lazy-require optional deps — startup won't crash if not yet installed
let axios, FormData, NodeClam;
try {
  axios = require("axios");
} catch {
  axios = null;
}
try {
  FormData = require("form-data");
} catch {
  FormData = null;
}
try {
  NodeClam = require("clamscan");
} catch {
  NodeClam = null;
}

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";
const VT_THRESHOLD = parseInt(process.env.VT_THRESHOLD || "3", 10);
const VT_TIMEOUT_MS = parseInt(process.env.VT_TIMEOUT_MS || "60000", 10);
const VT_POLL_MS = 5000; // poll interval for VT analysis result
const VT_MAX_RETRY = 3; // max transient retries per poll tick (BUG FIX #5)

const CLAM_SOCKET = process.env.CLAM_SOCKET || "/var/run/clamav/clamd.ctl";
const CLAM_HOST = process.env.CLAM_HOST || "127.0.0.1";
const CLAM_PORT = parseInt(process.env.CLAM_PORT || "3310", 10);

const HASH_DB_PATH = process.env.HASH_DB_PATH || "";

const BUILTIN_MALWARE_HASHES = new Set([
  "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",

  "131f95c51cc819465fa1797f6ccacf9d494aaaff46fa3eac73ae63ffbdfd8267",

  "5d3f026a5b2aaebb7719c3b3e18f4aac93b87b3f6e7df28aaeb8793e5c0ddc4b",

  "b3c39aeb14425f137b5bd0fd7654f1d6a45c0e8518ef7b3f5985640c9f5e1cf2",
]);

function _buildHashDB() {
  const db = new Set(BUILTIN_MALWARE_HASHES);
  if (!HASH_DB_PATH) return db;
  try {
    const lines = fs.readFileSync(HASH_DB_PATH, "utf8").split("\n");
    for (const line of lines) {
      const h = line.trim().toLowerCase();
      if (h && !h.startsWith("#") && /^[0-9a-f]{64}$/.test(h)) db.add(h);
    }
    console.info(`[Layer 3] Loaded ${db.size} hashes from ${HASH_DB_PATH}`);
  } catch (err) {
    console.warn(
      `[Layer 3] Could not load HASH_DB_PATH (${HASH_DB_PATH}): ${err.message}`,
    );
  }
  return db;
}
const HASH_DB = _buildHashDB();

/**
 * BUG FIX #1: Stream-hash a file instead of reading it all into memory.
 * Old: fs.readFileSync → entire file in RAM (500MB file = 500MB spike).
 * New: pipe through crypto.Hash stream → constant O(1) memory.
 *
 * @param {string} filePath
 * @returns {Promise<string>} lowercase hex SHA-256
 */
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function withTimeout(promise, ms, label) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isTransientVTError(err) {
  const status = err?.response?.status;
  return status === 429 || status === 503 || status === 504 || !status;
}

/**
 * Check file hash against the cached malware hash database.
 *
 * @param {string} filePath
 * @returns {Promise<{ clean: boolean, hash: string, reason?: string }>}
 */
async function runHashCheck(filePath) {
  // BUG FIX #1: await the streaming hash instead of sync read
  const hash = await hashFile(filePath);

  if (HASH_DB.has(hash)) {
    return {
      clean: false,
      hash,
      reason: `SHA-256 hash matches known malware signature: ${hash}`,
    };
  }

  return { clean: true, hash };
}

/**
 * Scan file with ClamAV.
 *
 * Strategy:
 *   1. Try NodeClam (connects to clamd daemon via socket/TCP — fastest)
 *   2. Fall back to `clamscan` CLI (slower, no daemon required)
 *
 * @param {string} filePath
 * @returns {Promise<{ clean: boolean|null, virusName?: string, engine: string, reason?: string }>}
 */
async function runClamAV(filePath) {
  if (NodeClam) {
    try {
      const useSocket = fs.existsSync(CLAM_SOCKET);

      const clamConfig = {
        removeInfected: false,
        debugMode: false,
        scanRecursively: false,
        clamdscan: useSocket
          ? { socket: CLAM_SOCKET, timeout: 30000, active: true }
          : { host: CLAM_HOST, port: CLAM_PORT, timeout: 30000, active: true },
        preference: "clamdscan",
      };

      const clamscan = await new NodeClam().init(clamConfig);
      const { isInfected, viruses } = await clamscan.scanFile(filePath);

      return isInfected
        ? {
            clean: false,
            virusName: viruses[0] || "unknown",
            engine: "clamav-daemon",
            reason: `ClamAV detected: ${viruses[0] || "malware"}`,
          }
        : { clean: true, engine: "clamav-daemon" };
    } catch (err) {
      console.warn(
        "[Layer 3] NodeClam daemon error, falling back to CLI:",
        err.message,
      );
    }
  }

  try {
    await execFileAsync("clamscan", ["--no-summary", "--stdout", filePath], {
      timeout: 60_000,
    });

    // exit 0 = clean
    return { clean: true, engine: "clamscan-cli" };
  } catch (err) {
    if (err.code === 1) {
      // exit 1 = virus found
      // stdout line format: "/path/to/file: VirusName FOUND"
      const match = (err.stdout || "").match(/:\s+(.+)\s+FOUND/);
      const virusName = match ? match[1].trim() : "unknown";
      return {
        clean: false,
        virusName,
        engine: "clamscan-cli",
        reason: `ClamAV detected: ${virusName}`,
      };
    }

    // ClamAV not installed or other fatal error
    return {
      clean: null, // null = inconclusive / engine unavailable
      engine: "clamscan-cli",
      reason: `ClamAV unavailable: ${err.message}`,
    };
  }
}

/**
 * Submit file to VirusTotal and poll for results.
 *
 * Flow:
 *   1. Hash lookup — no upload needed if VT has seen the file before
 *   2. Upload if new file
 *   3. Poll until analysis complete or timeout, retrying transient errors
 *
 * @param {string}  filePath
 * @param {string}  sha256        — pre-computed hash (avoids re-hashing)
 * @param {string}  [originalName] — original filename for VT context (BUG FIX #9)
 * @returns {Promise<{
 *   clean:        boolean | null,
 *   engines:      number,
 *   detections:   number,
 *   detectedBy:   string[],
 *   permalink:    string,
 *   reason?:      string,
 * }>}
 */
async function runVirusTotal(filePath, sha256, originalName) {
  if (!axios || !FormData) {
    return {
      clean: null,
      reason:
        "axios/form-data not installed — run: npm install axios form-data",
    };
  }
  if (!VT_API_KEY) {
    return { clean: null, reason: "VIRUSTOTAL_API_KEY env var not set" };
  }

  const headers = { "x-apikey": VT_API_KEY };
  const vtBase = "https://www.virustotal.com/api/v3";

  try {
    const hashResp = await axios.get(`${vtBase}/files/${sha256}`, {
      headers,
      timeout: 15_000,
      validateStatus: (s) => s === 200 || s === 404,
    });

    if (hashResp.status === 200) {
      return parseVTAttributes(hashResp.data?.data?.attributes, sha256);
    }
    // 404 = VT has never seen this file → upload
  } catch (err) {
    return {
      clean: null,
      reason: `VirusTotal hash lookup failed: ${err.message}`,
    };
  }

  let analysisId;
  try {
    const stat = fs.statSync(filePath);
    let endpoint = `${vtBase}/files`;

    if (stat.size > 32 * 1024 * 1024) {
      // BUG FIX #4: Validate the large-file upload URL before using it
      endpoint = await getLargeFileUploadURL(vtBase, headers);
      if (!endpoint || typeof endpoint !== "string") {
        return {
          clean: null,
          reason: "VirusTotal did not return a valid large-file upload URL",
        };
      }
    }

    // BUG FIX #9: Use originalName for VT context so analysts see a meaningful
    // filename (e.g. "invoice.pdf") instead of a meaningless multer temp name.
    const uploadName = originalName || path.basename(filePath);

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), {
      filename: uploadName,
      contentType: "application/octet-stream",
    });

    const uploadResp = await axios.post(endpoint, form, {
      headers: { ...headers, ...form.getHeaders() },
      timeout: 120_000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    analysisId = uploadResp.data?.data?.id;
    if (!analysisId) throw new Error("No analysis ID returned from VT upload");
  } catch (err) {
    return { clean: null, reason: `VirusTotal upload failed: ${err.message}` };
  }

  const deadline = Date.now() + VT_TIMEOUT_MS;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    await sleep(VT_POLL_MS);

    try {
      const pollResp = await axios.get(`${vtBase}/analyses/${analysisId}`, {
        headers,
        timeout: 15_000,
      });

      consecutiveErrors = 0; // reset on success
      const status = pollResp.data?.data?.attributes?.status;

      if (status === "completed") {
        const fileResp = await axios.get(`${vtBase}/files/${sha256}`, {
          headers,
          timeout: 15_000,
        });
        return parseVTAttributes(fileResp.data?.data?.attributes, sha256);
      }
      // status: 'queued' | 'in-progress' → keep polling
    } catch (err) {
      consecutiveErrors++;

      if (!isTransientVTError(err) || consecutiveErrors > VT_MAX_RETRY) {
        // Permanent error or too many retries → give up gracefully
        return {
          clean: null,
          reason: `VirusTotal polling failed: ${err.message}`,
        };
      }

      // Transient — back off and retry
      console.warn(
        `[Layer 3] VT poll transient error (${consecutiveErrors}/${VT_MAX_RETRY}): ${err.message}`,
      );
      await sleep(VT_POLL_MS * consecutiveErrors); // exponential-ish back-off
    }
  }

  return {
    clean: null,
    reason: `VirusTotal analysis timed out after ${VT_TIMEOUT_MS}ms`,
  };
}

/**
 * Get a special upload URL for files larger than 32 MB.
 * BUG FIX #4: Validates the returned URL before returning.
 */
async function getLargeFileUploadURL(vtBase, headers) {
  const resp = await axios.get(`${vtBase}/files/upload_url`, {
    headers,
    timeout: 15_000,
  });
  const url = resp.data?.data;
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    throw new Error(
      `Invalid large-file upload URL received from VirusTotal: ${JSON.stringify(url)}`,
    );
  }
  return url;
}

/**
 * Parse VirusTotal file attributes into a unified result object.
 * BUG FIX #7: Guard against 0-engine reports being treated as clean.
 */
function parseVTAttributes(attrs, sha256) {
  if (!attrs) {
    return { clean: null, reason: "VirusTotal returned no attributes" };
  }

  const stats = attrs.last_analysis_stats || {};
  const results = attrs.last_analysis_results || {};
  const detections = (stats.malicious || 0) + (stats.suspicious || 0);
  const engines = Object.keys(results).length;
  const permalink = `https://www.virustotal.com/gui/file/${sha256}`;

  // BUG FIX #7: A report with 0 engines is stale or invalid — treat as
  // inconclusive rather than clean. Without this guard, 0 < VT_THRESHOLD (3)
  // = true and the file passes even though no engine actually scanned it.
  if (engines === 0) {
    return {
      clean: null,
      engines: 0,
      detections: 0,
      detectedBy: [],
      permalink,
      reason: "VirusTotal report has 0 engines — result is stale or incomplete",
    };
  }

  const detectedBy = Object.entries(results)
    .filter(
      ([, v]) => v.category === "malicious" || v.category === "suspicious",
    )
    .map(([engine, v]) => `${engine} (${v.result || v.category})`);

  const clean = detections < VT_THRESHOLD;

  return {
    clean,
    engines,
    detections,
    detectedBy,
    permalink,
    ...(!clean && {
      reason: `VirusTotal: ${detections}/${engines} engines flagged this file`,
    }),
  };
}

/**
 * Run all three antivirus engines against a file.
 *
 * Execution order:  Hash → ClamAV → VirusTotal
 * Short-circuit:    Stops at the first definitive positive detection.
 * Inconclusive:     If an engine returns null, scan continues to the next.
 *                   File is only blocked on a confirmed positive.
 *
 * BUG FIX #6: Removed fs.existsSync() TOCTOU race. The file-not-found
 * condition is now caught naturally by the stream inside hashFile().
 *
 * @param {string}  filePath     — absolute path to the file on disk
 * @param {string}  [originalName] — original filename (passed to VT for context)
 * @returns {Promise<{
 *   safe:       boolean,
 *   sha256:     string,
 *   hashCheck:  object,
 *   clamAV:     object,
 *   virusTotal: object,
 *   reason?:    string,
 * }>}
 */
async function layer3AntivirusScan(filePath, originalName) {
  const result = {
    safe: true,
    sha256: "",
    hashCheck: {},
    clamAV: {},
    virusTotal: {},
  };

  let hashResult;
  try {
    hashResult = await runHashCheck(filePath);
  } catch (err) {
    return {
      ...result,
      safe: false,
      reason: `Cannot read file: ${err.message}`,
    };
  }

  result.sha256 = hashResult.hash;
  result.hashCheck = hashResult;

  if (!hashResult.clean) {
    return { ...result, safe: false, reason: hashResult.reason };
  }

  const clamResult = await withTimeout(
    runClamAV(filePath),
    65_000,
    "ClamAV scan",
  ).catch((err) => ({ clean: null, engine: "clamav", reason: err.message }));

  result.clamAV = clamResult;

  if (clamResult.clean === false) {
    return { ...result, safe: false, reason: clamResult.reason };
  }

  const vtResult = await withTimeout(
    runVirusTotal(filePath, result.sha256, originalName),
    VT_TIMEOUT_MS + 5000,
    "VirusTotal scan",
  ).catch((err) => ({ clean: null, reason: err.message }));

  result.virusTotal = vtResult;

  if (vtResult.clean === false) {
    return { ...result, safe: false, reason: vtResult.reason };
  }

  return result;
}

module.exports = {
  layer3AntivirusScan,

  _internal: {
    hashFile,
    runHashCheck,
    runClamAV,
    runVirusTotal,
    parseVTAttributes,
    HASH_DB,
  },
};
