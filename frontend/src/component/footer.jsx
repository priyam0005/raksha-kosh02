// components/Footer.jsx
// src/components/Footer.jsx
import { Shield } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const footerLinks = {
  Docs: ["How it works", "Layers explained"],
  Legal: ["Terms of Service", "Privacy Policy"],
};

export default function Footer() {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate("/about");
  };

  const handleService = () => {
    navigate("/terms");
  };
  return (
    <footer className="sticky  left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800">
      {/* Main content */}
      <div className="max-w-5xl mx-auto px-8 py-6 grid grid-cols-3 gap-12 items-start">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-blue-400" />
            <span className="text-white font-bold text-sm tracking-widest uppercase">
              Raksha
            </span>

            <span className="text-blue-400 font-bold text-sm tracking-widest uppercase">
              Kosh
            </span>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed mb-4">
            Advanced file analysis with 4 independent security layers. Built for
            everyone.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs border border-zinc-700 hover:border-zinc-500 rounded-md px-3 py-1.5 transition-colors no-underline"
          >
            <FaGithub size={12} />
            View on GitHub
          </a>
        </div>

        {/* Link groups */}
        <div className="col-span-2 grid grid-cols-2 gap-8">
          {Object.entries(footerLinks).map(([group, items]) => (
            <div
              onClick={() => {
                if (group == "Docs") {
                  handleClick();
                } else {
                  handleService();
                }
              }}
              key={group}
            >
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3">
                {group}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a className="text-zinc-400 cursor-pointer hover:text-white text-xs transition-colors no-underline">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800 px-8 py-3 max-w-5xl mx-auto flex items-center justify-between">
        <span className="text-amber-600 text-xs">
          Developed by Cragey Cryptics
        </span>
        <div className="flex items-center gap-6">
          {[
            ["AES-256", "encrypted"],
            ["< 15s", "scan time"],
          ].map(([val, lbl]) => (
            <div key={val} className="text-center">
              <div className="text-blue-400 text-xs font-mono font-semibold">
                {val}
              </div>
              <div className="text-zinc-600 text-xs">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
