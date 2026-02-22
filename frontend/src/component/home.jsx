// src/components/Home.jsx    (or pages/Home.jsx, etc.)
// pages/Home.jsx
// src/pages/Home.jsx
// src/pages/Home.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Shield,
  Upload,
  X,
  ShieldAlert,
  ShieldCheck,
  File,
  Check,
} from "lucide-react";
import RakshaLogo from "../others/rakshalogo";
import { useNavigate } from "react-router-dom";

import {
  setFile,
  resetScan,
  uploadFileThunk,
  selectStatus,
  selectFile,
  selectResult,
  selectError,
} from "../store/scan";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
];
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_SIZE = 50 * 1024 * 1024;
const MAGIC = {
  FFD8FFE0: "image/jpeg",
  FFD8FFE1: "image/jpeg",
  "89504E47": "image/png",
  47494638: "image/gif",
  52494646: "image/webp",
  25504446: "application/pdf",
  "504B0304": "application/zip",
};

const LAYERS = [
  {
    key: "layer1",
    id: 1,
    label: "Magic Number Validation",
    sublabel: "Binary signature · File identity check",
    color: "text-blue-400",
  },
  {
    key: "layer2",
    id: 2,
    label: "Deep Content Analysis",
    sublabel: "Structure parsing · EXIF strip · Macro scan",
    color: "text-violet-400",
  },
  {
    key: "layer3",
    id: 3,
    label: "Metadata Forensics",
    sublabel: "EXIF/XMP · Timestamp · Injection detection",
    color: "text-amber-400",
  },
  {
    key: "layer4",
    id: 4,
    label: "Multi-Engine Antivirus",
    sublabel: "ClamAV · VirusTotal · SHA-256 hash check",
    color: "text-emerald-400",
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmtSize = (b) =>
  b < 1024
    ? `${b}B`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)}KB`
      : `${(b / 1048576).toFixed(2)}MB`;

function readMagic(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) =>
      res(
        Array.from(new Uint8Array(e.target.result))
          .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
          .join(""),
      );
    r.readAsArrayBuffer(file.slice(0, 8));
  });
}

function clientValidate(file, hex) {
  if (file.size > MAX_SIZE)
    return `File too large — ${fmtSize(file.size)} exceeds 50 MB`;
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext))
    return `Extension '${ext}' is not permitted`;
  if (!ALLOWED_MIMES.includes(file.type)) return `MIME type not permitted`;
  if (/[<>&"'`;\\/]/.test(file.name))
    return "Filename contains unsafe characters";
  if (!Object.keys(MAGIC).find((k) => hex.startsWith(k)))
    return "Unknown file signature — possible spoofing";
  return null;
}

// ─── dispatchFile ─────────────────────────────────────────────────────────────
export async function dispatchFile(file, dispatch, setClientError) {
  const hex = await readMagic(file);
  const err = clientValidate(file, hex);
  if (err) {
    setClientError(err);
    return;
  }
  setClientError("");
  dispatch(setFile({ name: file.name, size: file.size, type: file.type }));
  dispatch(uploadFileThunk(file));
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

// ─── FakeProgressBar ─────────────────────────────────────────────────────────
function FakeProgressBar({ status }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status !== "scanning") return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return Math.min(prev + (90 - prev) * 0.04, 90);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status === "result") setProgress(100);
  }, [status]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
          {status === "result" ? "Complete" : "Scanning..."}
        </span>
        <span className="text-xs font-mono text-blue-400 font-semibold">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #2563eb, #60a5fa)",
          }}
        />
      </div>
    </div>
  );
}

// ─── ScanningView ─────────────────────────────────────────────────────────────
function ScanningView({ file, status }) {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-8 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <File size={15} className="text-blue-400 shrink-0" />
        <span className="text-sm text-zinc-300 truncate font-mono flex-1">
          {file?.name}
        </span>
        <span className="text-xs text-zinc-600 shrink-0 font-mono">
          {file && fmtSize(file.size)}
        </span>
      </div>

      <FakeProgressBar status={status} />

      <div className="flex flex-col gap-2.5 mt-8">
        {LAYERS.map((layer, i) => (
          <div
            key={layer.key}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-pulse shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-300">{layer.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                {layer.sublabel}
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700">
              L{layer.id}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-amber-300 mt-8 tracking-widest uppercase font-mono">
        Keep this tab open
      </p>
    </div>
  );
}

// ─── ResultView ───────────────────────────────────────────────────────────────
function ResultView({ result, error, onReset }) {
  const passed = result?.success === true;
  const scanSummary = result?.scanSummary || {};
  const failedLayerKey =
    !passed && result?.layerCaught ? `layer${result.layerCaught}` : null;
  const failedLayer = LAYERS.find((l) => l.key === failedLayerKey);

  return (
    <div className="w-full max-w-md">
      <div
        className={`rounded-2xl border overflow-hidden ${
          passed
            ? "border-emerald-800/60 bg-zinc-950"
            : "border-red-800/60 bg-zinc-950"
        }`}
        style={{
          boxShadow: passed
            ? "0 0 40px rgba(16,185,129,0.08)"
            : "0 0 40px rgba(239,68,68,0.08)",
        }}
      >
        <div
          className={`h-px w-full ${passed ? "bg-emerald-500" : "bg-red-500"}`}
          style={{
            background: passed
              ? "linear-gradient(90deg, transparent, #10b981, transparent)"
              : "linear-gradient(90deg, transparent, #ef4444, transparent)",
          }}
        />

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                passed
                  ? "bg-emerald-950 border border-emerald-800/60"
                  : "bg-red-950 border border-red-800/60"
              }`}
            >
              {passed ? (
                <ShieldCheck size={28} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={28} className="text-red-400" />
              )}
            </div>
            <h2
              className={`text-xl font-bold tracking-tight ${
                passed ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {passed ? "File Verified" : "File Rejected"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5 text-center leading-relaxed max-w-xs">
              {result?.message || error || "Scan complete."}
            </p>
          </div>

          {/* ── PASSED ── */}
          {passed && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {LAYERS.map((layer) => {
                  const layerData = scanSummary[layer.key];
                  return (
                    <div
                      key={layer.key}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/50 border border-emerald-900/50"
                    >
                      <div className="w-5 h-5 rounded-lg bg-emerald-900/80 flex items-center justify-center shrink-0 border border-emerald-800/60">
                        <Check size={10} className="text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-300">
                          {layer.label}
                        </p>
                        {layer.key === "layer1" && layerData?.detectedType && (
                          <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate">
                            {layerData.detectedType}
                          </p>
                        )}
                        {layer.key === "layer2" &&
                          layerData?.entryCount !== undefined && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {layerData.entryCount} entries scanned
                            </p>
                          )}
                        {layer.key === "layer4" &&
                          layerData?.strippedFields?.length > 0 && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {layerData.strippedFields.length} metadata fields
                              stripped
                            </p>
                          )}
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-500 border border-emerald-800/40">
                        PASS
                      </span>
                    </div>
                  );
                })}
              </div>

              {result?.file && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mt-2">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-3">
                    File Info
                  </p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <span className="text-zinc-600 font-mono">Name</span>
                    <span className="text-zinc-300 truncate font-mono">
                      {result.file.originalName}
                    </span>
                    <span className="text-zinc-600 font-mono">Size</span>
                    <span className="text-zinc-300 font-mono">
                      {fmtSize(result.file.size)}
                    </span>
                    <span className="text-zinc-600 font-mono">Time</span>
                    <span className="text-zinc-300 font-mono">
                      {result.timeTaken}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FAILED ── */}
          {!passed && (
            <div className="space-y-3">
              {failedLayer && (
                <div className="text-center mb-1">
                  <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-900/60">
                    Failed at Layer {result.layerCaught} — {failedLayer.label}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {LAYERS.map((layer) => {
                  const isFailed = layer.key === failedLayerKey;
                  const didPass =
                    result?.layerCaught && layer.id < result.layerCaught;
                  const isPending = !isFailed && !didPass;
                  return (
                    <div
                      key={layer.key}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                        isFailed
                          ? "bg-red-950/50 border-red-900/50"
                          : didPass
                            ? "bg-emerald-950/50 border-emerald-900/50"
                            : "bg-zinc-900/60 border-zinc-800"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                          isFailed
                            ? "bg-red-900/80 border-red-800/60"
                            : didPass
                              ? "bg-emerald-900/80 border-emerald-800/60"
                              : "bg-zinc-800 border-zinc-700"
                        }`}
                      >
                        {isFailed && <X size={10} className="text-red-400" />}
                        {didPass && (
                          <Check size={10} className="text-emerald-400" />
                        )}
                        {isPending && (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 block" />
                        )}
                      </div>
                      <p
                        className={`text-sm font-medium ${
                          isFailed
                            ? "text-red-300"
                            : didPass
                              ? "text-emerald-300"
                              : "text-zinc-600"
                        }`}
                      >
                        {layer.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {result?.reason && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-2">
                    Reason
                  </p>
                  <p className="text-sm text-zinc-200">{result.reason}</p>
                </div>
              )}

              {result?.explanation && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-2">
                    Explanation
                  </p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full mt-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-green-400 hover:text-zinc-200 text-sm font-medium transition-all duration-200 cursor-pointer"
      >
        Scan another file
      </button>
    </div>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, inputRef }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className="relative rounded-xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden"
      style={{
        border: drag
          ? "1.5px dashed rgba(59,130,246,0.7)"
          : "1.5px dashed rgba(63,63,70,0.8)",
        background: drag ? "rgba(59,130,246,0.06)" : "rgba(24,24,27,0.4)",
      }}
    >
      {/* subtle grid bg */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border transition-all duration-300"
          style={{
            background: drag ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.08)",
            borderColor: drag
              ? "rgba(59,130,246,0.5)"
              : "rgba(59,130,246,0.15)",
            boxShadow: drag ? "0 0 20px rgba(59,130,246,0.2)" : "none",
          }}
        >
          <Upload size={20} className="text-blue-400" />
        </div>
        <p className="text-sm text-zinc-400 mb-1.5">
          <button
            className="text-blue-400 hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer p-0 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose file
          </button>{" "}
          <span className="text-zinc-500">or drag and drop</span>
        </p>
        <p className="text-xs font-mono text-zinc-600 tracking-wide">
          JPG · PNG · PDF · DOCX · XLSX · PPTX · max 50 MB
        </p>
      </div>
    </div>
  );
}

// ─── UploadView ───────────────────────────────────────────────────────────────
function UploadView({ onFile, clientError }) {
  const inputRef = useRef();

  return (
    <div className="w-full  max-w-md">
      {/* Header */}
      <div className="text-center mt-2 mb-10">
        <div className="flex justify-center mb-5">
          <RakshaLogo size="lg" />
        </div>

        <h1
          className="text-2xl font-bold text-white mb-3"
          style={{
            letterSpacing: "0.18em",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span className="text-white">RAKSHA </span>
          <span className="text-blue-400">KOSH</span>
        </h1>

        <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">
          Analyze suspicious files with advanced multi-layer security
          validation.
        </p>
      </div>

      {/* Terminal Card */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-[rgba(4,4,6,0.97)] shadow-[0_24px_64px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)]">
        {/* Terminal top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80">
          <div className="flex gap-1.5">
            {/* Red dot */}
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            {/* Yellow dot */}
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            {/* Green dot */}
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          </div>
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-mono">
            upload terminal
          </span>
          <div className="w-12" />
        </div>

        <div className="p-5">
          <DropZone onFile={onFile} inputRef={inputRef} />

          {clientError && (
            <div className="mt-4 flex items-start gap-2.5 bg-red-950/60 border border-red-900/50 rounded-xl px-4 py-3">
              <X size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400 font-mono">{clientError}</p>
            </div>
          )}

          {/* Info strip */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-amber-500/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
            4-Layer Defense • Smart Threat Detection
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between mt-6 px-2 py-4 rounded-xl border border-zinc-800/50 bg-[rgba(4,4,6,0.7)]">
        {[
          ["4", "Security Layers"],

          ["< 15s", "Scan Time"],
        ].map(([v, l], i, arr) => (
          <div key={v} className="flex items-center flex-1">
            <div className="text-center flex-1">
              <div className="text-blue-400 font-bold text-lg font-mono tracking-tight">
                {v}
              </div>
              <div className="text-zinc-600 text-xs mt-0.5 font-mono">{l}</div>
            </div>
            {i < arr.length - 1 && (
              <div className="w-px h-6 bg-zinc-800 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files[0]) onFile(e.target.files[0]);
        }}
      />
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const dispatch = useDispatch();

  const status = useSelector(selectStatus);
  const file = useSelector(selectFile);
  const result = useSelector(selectResult);
  const error = useSelector(selectError);

  const [clientError, setClientError] = useState("");

  const handleFile = useCallback(
    (rawFile) => dispatchFile(rawFile, dispatch, setClientError),
    [dispatch],
  );

  const handleReset = useCallback(() => {
    dispatch(resetScan());
    setClientError("");
  }, [dispatch]);

  return (
    <main className="min-h-screen  bg-gradient-to-br from-black via-gray-800 to-black  flex items-center justify-center pt-20 pb-8 px-4">
      {status === "idle" && (
        <UploadView onFile={handleFile} clientError={clientError} />
      )}
      {status === "scanning" && <ScanningView file={file} status={status} />}
      {status === "result" && (
        <ResultView result={result} error={error} onReset={handleReset} />
      )}
    </main>
  );
}
