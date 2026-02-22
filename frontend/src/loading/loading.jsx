import { useState, useEffect } from "react";

const LoadingPage = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center space-y-8">
        {/* ── Shield Logo ── */}
        <div className="relative w-32 h-32 mx-auto">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin" />

          {/* Inner rotating ring — reverse */}
          <div
            className="absolute inset-3 border-4 border-gray-800 border-b-blue-400 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />

          {/* Center shield */}
          <div className="absolute inset-6 bg-[#0d1a2e] rounded-full flex items-center justify-center border-2 border-blue-500/30">
            <svg
              width="32"
              height="36"
              viewBox="0 0 24 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-pulse"
            >
              <path
                d="M12 1.5L2 5.5V13C2 18.55 6.42 23.74 12 25.5C17.58 23.74 22 18.55 22 13V5.5L12 1.5Z"
                stroke="#3B82F6"
                strokeWidth="1.6"
                strokeLinejoin="round"
                fill="rgba(59,130,246,0.08)"
              />
              <path
                d="M12 5L5 8.2V13C5 17.1 8.15 20.9 12 22.3C15.85 20.9 19 17.1 19 13V8.2L12 5Z"
                stroke="#3B82F6"
                strokeWidth="0.8"
                strokeLinejoin="round"
                fill="rgba(59,130,246,0.05)"
                opacity="0.7"
              />
            </svg>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h2
            className="text-2xl font-bold text-white"
            style={{
              letterSpacing: "0.15em",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span className="text-white">RAKSHA </span>
            <span className="text-blue-400">KOSH</span>
            <span className="text-zinc-500">{dots}</span>
          </h2>
          <p className="text-gray-400 text-sm font-mono">
            Please wait while we fetch your data
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-loading-bar" />
          </div>
        </div>

        {/* Floating Dots */}
        <div className="flex justify-center gap-2">
          <div
            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <div
            className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 70%; }
          100% { transform: translateX(400%); width: 40%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
