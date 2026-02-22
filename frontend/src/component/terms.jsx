export default function TermsPage() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-zinc-800 via-zinc-950 to-black pt-24 pb-16 px-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto space-y-12">
        {/* ── Header ── */}
        <div className="space-y-3">
          <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">
            Legal
          </p>
          <h1
            className="text-3xl font-bold uppercase tracking-widest"
            style={{ letterSpacing: "0.14em" }}
          >
            <span className="text-white">Terms of </span>
            <span className="text-blue-400">Service</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono">
            Last updated: February 2026
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed pt-1">
            By accessing or using Raksha Kosh, you agree to be bound by these
            Terms of Service. Please read them carefully before uploading any
            file or creating an account.
          </p>
        </div>

        <div className="w-full h-px bg-zinc-800" />

        {/* ── Sections ── */}
        <div className="space-y-6">
          <Section label="01" title="Acceptance of Terms">
            By using Raksha Kosh — whether as a guest or a registered user — you
            acknowledge that you have read, understood, and agree to these
            terms. If you do not agree, you may not use the service.
          </Section>

          <Section label="02" title="Use of the Service">
            Raksha Kosh is provided solely for the purpose of security scanning
            files you own or have legal authorization to submit. You agree not
            to upload files for any unlawful purpose, to attempt to exploit or
            reverse-engineer the scanning system, or to use the service in any
            way that violates applicable law.
          </Section>

          <Section label="03" title="File Handling">
            Files you upload are processed in memory and scanned immediately.
            Raksha Kosh does not permanently store the contents of uploaded
            files. Temporary copies exist only for the duration of the scan and
            are deleted upon completion regardless of outcome.
          </Section>

          <Section label="04" title="Scan Results">
            Scan results are provided as informational output only. Raksha Kosh
            does not guarantee that every threat will be detected, nor that
            every flagged file is malicious. Results should be used as one input
            among many in your security assessment — not as a sole determination
            of safety.
          </Section>

          <Section label="05" title="User Accounts">
            If you create an account, you are responsible for maintaining the
            confidentiality of your credentials. You agree to notify us
            immediately of any unauthorized access to your account. Raksha Kosh
            is not liable for any loss resulting from unauthorized use of your
            account.
          </Section>

          <Section label="06" title="Scan History & Data">
            Registered users have their scan results saved to a personal
            dashboard. This includes file name, file size, scan timestamp, and
            the result of each security layer. File contents are never saved.
            You may delete your account and associated scan history at any time.
          </Section>

          <Section label="07" title="Intellectual Property">
            All code, design, branding, and infrastructure behind Raksha Kosh
            are the intellectual property of its creators. You may not copy,
            reproduce, or distribute any part of the service without explicit
            written permission.
          </Section>

          <Section label="08" title="Limitation of Liability">
            Raksha Kosh is provided on an as-is basis. To the fullest extent
            permitted by law, we disclaim all warranties, express or implied. We
            are not liable for any damages arising from your use of or inability
            to use the service, including damages resulting from reliance on
            scan results.
          </Section>

          <Section label="09" title="Changes to Terms">
            We reserve the right to modify these terms at any time. Changes will
            be posted on this page with an updated date. Continued use of the
            service after changes are posted constitutes your acceptance of the
            revised terms.
          </Section>

          <Section label="10" title="Contact">
            If you have any questions about these terms, you can reach us
            through the contact information provided on the Raksha Kosh
            platform.
          </Section>
        </div>

        <p className="text-center text-zinc-700 text-xs font-mono pt-4">
          · Raksha Kosh · Terms of Service · Feb 2026 ·
        </p>
      </div>
    </div>
  );
}

function Section({ label, title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-[#0f0f0f] p-5 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-blue-400 font-mono text-xs border border-blue-500/30 bg-blue-950/30 px-2 py-0.5 rounded-md">
          {label}
        </span>
        <h3 className="text-zinc-200 font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-zinc-500 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
