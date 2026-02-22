export default function AboutPage() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-zinc-800 via-zinc-950 to-black pt-24 pb-16 px-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto space-y-16">
        {/* ── Hero ── */}
        <div className="text-center space-y-4">
          <h1
            className="text-3xl sm:text-4xl font-bold uppercase tracking-widest"
            style={{ letterSpacing: "0.18em" }}
          >
            <span className="text-white">RAKSHA </span>
            <span className="text-blue-400">KOSH</span>
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-xl mx-auto">
            Raksha Kosh is a multi-layer file security scanner built to detect
            threats, malicious payloads, and suspicious content before they
            reach your systems. Upload any file — we inspect it through four
            independent security layers and return a verdict in seconds.
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="w-full h-px bg-zinc-800" />

        {/* ── How it works ── */}
        <div className="space-y-8">
          <div>
            <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-2">
              How it works
            </p>
            <h2 className="text-white text-xl font-semibold">
              4-Layer Defense System
            </h2>
            <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
              Every file you upload passes through four independent security
              layers in sequence. If a file fails any layer, scanning stops
              immediately and you get a detailed report of exactly what was
              found and where.
            </p>
          </div>

          <div className="space-y-4">
            {/* Layer 1 */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-400 font-mono text-xs border border-blue-500/30 bg-blue-950/30 px-2 py-0.5 rounded-md">
                  L1
                </span>
                <h3 className="text-zinc-200 font-semibold text-sm">
                  File Signature / MIME Check
                </h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                The first layer reads the raw byte signature of the uploaded
                file — also known as the magic number — and compares it against
                the declared MIME type. This catches files that have been
                renamed to disguise their true format, such as an executable
                masquerading as a PDF or image.
              </p>
            </div>

            {/* Layer 2 */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-400 font-mono text-xs border border-blue-500/30 bg-blue-950/30 px-2 py-0.5 rounded-md">
                  L2
                </span>
                <h3 className="text-zinc-200 font-semibold text-sm">
                  Deep Content Analysis
                </h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                The second layer inspects the internal structure of the file.
                Even if the signature matches, the content itself may be
                malformed, corrupted, or contain embedded threats. This layer
                parses the file format deeply to detect structural anomalies,
                embedded scripts, and hidden payloads that signature checks
                alone would miss.
              </p>
            </div>

            {/* Layer 3 */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-400 font-mono text-xs border border-blue-500/30 bg-blue-950/30 px-2 py-0.5 rounded-md">
                  L3
                </span>
                <h3 className="text-zinc-200 font-semibold text-sm">
                  Metadata Forensics
                </h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                The third layer performs forensic analysis on the file's
                metadata. Attackers often embed malicious scripts or injected
                payloads inside metadata fields that appear harmless. This layer
                scans for injection threats, suspicious timestamps, and any
                field that contains content it should not.
              </p>
            </div>

            {/* Layer 4 */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-blue-400 font-mono text-xs border border-blue-500/30 bg-blue-950/30 px-2 py-0.5 rounded-md">
                  L4
                </span>
                <h3 className="text-zinc-200 font-semibold text-sm">
                  Antivirus Scan (70+ Engines)
                </h3>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                The final layer runs the file against over 70 antivirus engines
                simultaneously, including hash-based lookup and real-time
                behavioral analysis. This catches known malware, ransomware,
                trojans, and any file that has been previously flagged across
                global threat databases.
              </p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="w-full h-px bg-zinc-800" />

        {/* ── Sign in benefits ── */}
        <div className="space-y-6">
          <div>
            <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest mb-2">
              Why sign in
            </p>
            <h2 className="text-white text-xl font-semibold">
              Keep Track of Your Scans
            </h2>
            <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
              You can use Raksha Kosh without an account — your file will be
              scanned and the result shown immediately. However, once you leave
              the page, that result is gone.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-zinc-300 text-sm font-medium">Scan History</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Every file you scan while signed in is saved to your personal
                dashboard with a full report — which layer caught it, the exact
                reason, and a timestamp of when it was scanned.
              </p>
            </div>

            <div className="w-full h-px bg-zinc-800" />

            <div className="space-y-1">
              <p className="text-zinc-300 text-sm font-medium">Scan Count</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Your dashboard shows a running count of total scans, how many
                files were clean, how many were flagged as threats, and your
                personal threat detection rate over time.
              </p>
            </div>

            <div className="w-full h-px bg-zinc-800" />

            <div className="space-y-1">
              <p className="text-zinc-300 text-sm font-medium">
                Instant — No Waiting
              </p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Signing in has zero impact on scan speed. Results are shown to
                you immediately and saving to your history happens silently in
                the background. You never wait for it.
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-zinc-700 text-xs font-mono">
          · AES-256 encrypted · no files stored · results only ·
        </p>
      </div>
    </div>
  );
}
