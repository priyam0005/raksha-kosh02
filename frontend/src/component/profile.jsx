import { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Activity,
  Layers,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserScans } from "../store/scanUser";
import LoadingPage from "../loading/loading";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const mono = "'IBM Plex Mono', monospace";

// ─── Layer table for CLEAN scans (all layers, sorted by layer number) ────────
function CleanLayerTable({ layers }) {
  const sorted = [...layers].sort((a, b) => a.layer - b.layer);
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-900">
          {["#", "Layer", "Detail", "Status"].map((h, i) => (
            <th
              key={h}
              style={{ fontFamily: mono }}
              className={`text-zinc-700 text-[10px] tracking-widest uppercase pb-2.5 font-normal ${
                i === 0
                  ? "text-left w-8"
                  : i === 1
                    ? "text-left"
                    : i === 2
                      ? "text-left hidden sm:table-cell"
                      : "text-right"
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((layer, i) => (
          <tr key={i} className="border-b border-zinc-900/40 last:border-0">
            <td
              className="py-2.5 text-zinc-700 text-[11px]"
              style={{ fontFamily: mono }}
            >
              {layer.layer}
            </td>
            <td
              className="py-2.5 text-zinc-400 text-[11px]"
              style={{ fontFamily: mono }}
            >
              {layer.name}
            </td>
            <td
              className="py-2.5 text-zinc-600 text-[11px] hidden sm:table-cell pr-6"
              style={{ fontFamily: mono }}
            >
              {layer.detail || "—"}
            </td>
            <td className="py-2.5 text-right">
              <span
                className="inline-flex items-center gap-1.5 text-emerald-500 text-[10px] tracking-widest uppercase"
                style={{ fontFamily: mono }}
              >
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                pass
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Threat detail for FAILED scans ──────────────────────────────────────────
// Shows: passed layer count summary → failed layer card → analysis/reason
function ThreatDetail({ scan }) {
  const sorted = [...(scan.layers || [])].sort((a, b) => a.layer - b.layer);
  const failedLayer = sorted.find((l) => l.status === "failed");
  const passedCount = sorted.filter((l) => l.status === "passed").length;

  console.log(scan);

  return (
    <div className="space-y-4">
      {/* Passed layers — collapsed summary */}
      {passedCount > 0 && (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(passedCount, 8) }).map((_, i) => (
              <span
                key={i}
                className="w-5 h-1 rounded-full bg-emerald-700/50"
              />
            ))}
          </div>
          <span
            className="text-zinc-600 text-[11px]"
            style={{ fontFamily: mono }}
          >
            {passedCount} layer{passedCount > 1 ? "s" : ""} passed
          </span>
        </div>
      )}

      {/* Failed layer */}
      {failedLayer && (
        <div>
          <p
            className="text-zinc-700 text-[10px] tracking-widest uppercase mb-2"
            style={{ fontFamily: mono }}
          >
            Failed at
          </p>
          <div className="rounded-lg border border-red-900/35 bg-red-950/15 px-4 py-3 flex items-start gap-3">
            <AlertTriangle
              size={13}
              className="text-red-400 mt-0.5 shrink-0"
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <span
                  className="text-zinc-600 text-[10px]"
                  style={{ fontFamily: mono }}
                >
                  L{failedLayer.layer}
                </span>
                <span
                  className="text-red-300 text-[12px] font-medium"
                  style={{ fontFamily: mono }}
                >
                  {failedLayer.name}
                </span>
              </div>
              {failedLayer.detail && (
                <p
                  className="text-zinc-500 text-[11px] leading-relaxed"
                  style={{ fontFamily: mono }}
                >
                  {failedLayer.detail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis / reason */}
      {scan.reason && (
        <p
          className="text-zinc-400 text-[12px] leading-relaxed"
          style={{ fontFamily: mono }}
        >
          {scan.reason}
        </p>
      )}
      {scan.explanation && (
        <p
          className="text-zinc-600 text-[11px] leading-relaxed mt-1"
          style={{ fontFamily: mono }}
        >
          {scan.explanation}
        </p>
      )}
      {scan.failReasons?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {scan.failReasons.map((r, i) => (
            <li
              key={i}
              className="text-zinc-600 text-[11px]"
              style={{ fontFamily: mono }}
            >
              · {r || null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── ScanCard ─────────────────────────────────────────────────────────────────
function ScanCard({ scan, index }) {
  const [expanded, setExpanded] = useState(false);
  const isClean = scan.status === "clean";

  console.log(scan.failReasons);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: index * 0.035 }}
      className="border-b border-zinc-900 last:border-0"
    >
      {/* Row */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/[0.015] transition-colors duration-150 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-[2px] h-7 rounded-full shrink-0 ${
              isClean ? "bg-emerald-600/70" : "bg-red-500/80"
            }`}
          />
          <div className="min-w-0">
            <p
              className="text-zinc-200 text-[13px] tracking-tight truncate"
              style={{ fontFamily: mono }}
            >
              {scan.fileName}
            </p>
            <p
              className="text-zinc-700 text-[11px] mt-0.5"
              style={{ fontFamily: mono }}
            >
              {formatBytes(scan.fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 shrink-0 ml-6">
          <span
            className={`text-[10px] tracking-widest uppercase hidden md:block ${
              isClean ? "text-emerald-600" : "text-red-400"
            }`}
            style={{ fontFamily: mono }}
          >
            {isClean ? "clean" : "threat"}
          </span>

          <div className="text-right hidden sm:block">
            <p
              className="text-zinc-500 text-[11px]"
              style={{ fontFamily: mono }}
            >
              {formatDate(scan.createdAt)}
            </p>
            <p
              className="text-zinc-700 text-[11px]"
              style={{ fontFamily: mono }}
            >
              {formatTime(scan.createdAt)}
            </p>
          </div>

          <ChevronDown
            size={13}
            strokeWidth={1.5}
            className={`text-zinc-700 group-hover:text-zinc-400 transition-all duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-6 pb-5 pt-4 border-t border-zinc-900"
              style={{ background: isClean ? "#0a0a0d" : "#0d0a0a" }}
            >
              {isClean ? (
                <CleanLayerTable layers={scan.layers || []} />
              ) : (
                <ThreatDetail scan={scan} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const dispatch = useDispatch();
  const { scans, total, status, error } = useSelector((state) => state.scans);
  const user = useSelector((state) => state.just.user);

  useEffect(() => {
    dispatch(fetchUserScans());
  }, [dispatch]);

  if (status === "idle" || status === "loading") return <LoadingPage />;

  if (status === "failed")
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#08080b" }}
      >
        <div className="text-center">
          <p
            className="text-zinc-500 text-sm mb-1"
            style={{ fontFamily: mono }}
          >
            error loading records
          </p>
          <p
            className="text-zinc-700 text-xs mb-5"
            style={{ fontFamily: mono }}
          >
            {error}
          </p>
          <button
            onClick={() => dispatch(fetchUserScans())}
            className="text-xs text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 px-5 py-2 transition-all"
            style={{ fontFamily: mono }}
          >
            retry
          </button>
        </div>
      </div>
    );

  const totalScans = total;
  const cleanScans = scans.filter((s) => s.status === "clean").length;
  const failedScans = scans.filter((s) => s.status === "failed").length;
  const detectionRate = totalScans
    ? Math.round((failedScans / totalScans) * 100)
    : 0;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');`}</style>

      <div
        className="min-h-screen pt-20"
        style={{
          background: "#08080b",
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* ── Identity + Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-8 mb-10 pb-8 border-b border-zinc-900"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0 border border-zinc-800"
                style={{ background: "#111115" }}
              >
                <span
                  className="text-zinc-400 text-[13px]"
                  style={{ fontFamily: mono }}
                >
                  {initials}
                </span>
              </div>
              <div>
                <p className="text-zinc-100 text-[15px] font-medium tracking-tight">
                  {user?.name}
                </p>
                <p
                  className="text-zinc-600 text-[12px] mt-0.5"
                  style={{ fontFamily: mono }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            <div
              className="flex items-center divide-x divide-zinc-900 border border-zinc-900"
              style={{ background: "#0c0c0f" }}
            >
              {[
                { label: "total", value: totalScans, color: "text-zinc-300" },
                {
                  label: "clean",
                  value: cleanScans,
                  color: "text-emerald-500",
                },
                { label: "threats", value: failedScans, color: "text-red-400" },
                {
                  label: "threat rate",
                  value: `${detectionRate}%`,
                  color: "text-amber-500",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="px-6 py-3.5 text-center">
                  <p
                    className={`text-[18px] font-medium tabular-nums ${color}`}
                    style={{ fontFamily: mono }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-zinc-700 text-[9px] tracking-widest uppercase mt-0.5"
                    style={{ fontFamily: mono }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Scan Records ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-zinc-700 text-[10px] tracking-widest uppercase"
                style={{ fontFamily: mono }}
              >
                Scan Records
              </p>
              <p
                className="text-zinc-800 text-[10px]"
                style={{ fontFamily: mono }}
              >
                {totalScans} entries
              </p>
            </div>

            <div
              className="border border-zinc-900 overflow-hidden"
              style={{ background: "#0c0c0f" }}
            >
              {scans.length > 0 && (
                <div
                  className="flex items-center justify-between px-6 py-3 border-b border-zinc-900"
                  style={{ background: "#0a0a0d" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-[2px] opacity-0 h-4" />
                    <p
                      className="text-zinc-700 text-[10px] tracking-widest uppercase"
                      style={{ fontFamily: mono }}
                    >
                      File
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <p
                      className="text-zinc-700 text-[10px] tracking-widest uppercase hidden md:block"
                      style={{ fontFamily: mono }}
                    >
                      Result
                    </p>
                    <p
                      className="text-zinc-700 text-[10px] tracking-widest uppercase hidden sm:block"
                      style={{ fontFamily: mono }}
                    >
                      Timestamp
                    </p>
                    <div className="w-3" />
                  </div>
                </div>
              )}

              {scans.length === 0 ? (
                <div className="text-center py-20">
                  <p
                    className="text-zinc-700 text-[13px]"
                    style={{ fontFamily: mono }}
                  >
                    No scan records.
                  </p>
                </div>
              ) : (
                scans.map((scan, i) => (
                  <ScanCard key={scan._id} scan={scan} index={i} />
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
