import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../store/login";

function LogIn() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLogin] = useState(true);
  const { loading, error } = useSelector((state) => state.just);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm();

  const switchMode = () => navigate("/register");

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(loginUser(data));
      if (loginUser.fulfilled.match(resultAction)) {
        reset();
        navigate("/");
      } else if (loginUser.rejected.match(resultAction)) {
        setError("password", {
          message: resultAction.payload || "Login failed",
        });
      }
    } catch (e) {
      setError("password", { message: "An unexpected error occurred." });
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-zinc-800 via-zinc-950 to-black flex items-center justify-center px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
            <svg width="28" height="32" viewBox="0 0 24 28" fill="none">
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
              />
            </svg>
          </div>
          <h1
            className="text-xl font-bold tracking-widest uppercase"
            style={{ letterSpacing: "0.18em" }}
          >
            <span className="text-white">RAKSHA </span>
            <span className="text-blue-400">KOSH</span>
          </h1>
          <p className="text-zinc-600 text-xs font-mono mt-1">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800/60 bg-[#0f0f0f] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.7)]">
          {/* Terminal bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            </div>
            <span className="text-xs text-zinc-600 uppercase tracking-widest font-mono">
              auth terminal
            </span>
            <div className="w-12" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-zinc-400 text-xs font-mono mb-1.5 uppercase tracking-widest">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 text-sm font-mono placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                {...register("email", {
                  required: "Email is required",
                  minLength: { value: 4, message: "Email too short" },
                  pattern: {
                    value:
                      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    message: "Please enter a valid email",
                  },
                })}
              />
              {errors.email && (
                <p className="text-red-400 text-xs font-mono mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-zinc-400 text-xs font-mono mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 text-sm font-mono placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "At least 6 characters" },
                  maxLength: { value: 18, message: "At most 18 characters" },
                })}
              />
              {errors.password && (
                <p className="text-red-400 text-xs font-mono mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-blue-500" />
                <span className="text-xs text-zinc-500 font-mono">
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Global error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-400 text-xs font-mono">
                  Invalid credentials
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              disabled={loading}
              type="submit"
              className={`w-full py-2.5 rounded-xl text-sm font-semibold font-mono transition-colors ${
                loading
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              }`}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* Switch to register */}
            <p className="text-center text-xs text-zinc-600 font-mono">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Sign up
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LogIn;
