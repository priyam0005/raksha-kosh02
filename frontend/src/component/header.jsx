// components/Header.jsx
// src/components/Header.jsx
import { User2, Home, LogIn, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem("auth");
  const isLoggedIn = !!token;

  const handleSignOut = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  const user = useSelector((state) => state.just.user);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16  bg-gradient-to-r from-black/80 via-slate-800 to-black border-b border-zinc-800 flex items-center justify-between px-6 sm:px-10">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 no-underline group">
        <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/40 transition-colors" />
          <svg width="18" height="20" viewBox="0 0 24 28" fill="none">
            <path
              d="M12 1.5L2 5.5V13C2 18.55 6.42 23.74 12 25.5C17.58 23.74 22 18.55 22 13V5.5L12 1.5Z"
              stroke="#3B82F6"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="rgba(59,130,246,0.1)"
            />
            <path
              d="M12 5L5 8.2V13C5 17.1 8.15 20.9 12 22.3C15.85 20.9 19 17.1 19 13V8.2L12 5Z"
              stroke="#3B82F6"
              strokeWidth="0.9"
              strokeLinejoin="round"
              fill="rgba(59,130,246,0.06)"
            />
          </svg>
        </div>

        <span
          className="text-sm font-bold uppercase hidden sm:block"
          style={{
            letterSpacing: "0.18em",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span className="text-white">Raksha</span>{" "}
          <span className="text-blue-400">Kosh</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-6">
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <Home size={18} strokeWidth={1.6} />
          <span>Home</span>
        </button>

        {isLoggedIn ? (
          <>
            {/* Profile */}
            <button
              onClick={() => navigate("/profile")}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400 text-[11px] font-semibold">
                {initials}
              </div>
              <span>Profile</span>
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-300 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} strokeWidth={1.6} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center cursor-pointer gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <LogIn size={18} strokeWidth={1.6} />
            <span>Login</span>
          </button>
        )}
      </nav>
    </header>
  );
}
