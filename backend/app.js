require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { ALLOWED_MIMES } = require("./controller/uploadController");
const uploadRoutes = require("./router/raksha");
const scanRoutes = require("./router/scanRouter");

const app = express();
const PORT = process.env.PORT || 911;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://raksha-kosh001.vercel.app",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("Server is online"));
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);
app.use("/upload", uploadRoutes);
app.use("/scan", scanRoutes);
// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({
      success: false,
      layer: 0,
      reason: "File too large. Maximum allowed size is 10 MB.",
    });

  if (err.message?.startsWith("File type not allowed"))
    return res.status(415).json({
      success: false,
      layer: 0,
      reason: err.message,
      hint: `Allowed types: ${ALLOWED_MIMES.join(", ")}`,
    });

  console.error("[Global Error Handler]", err);
  return res
    .status(500)
    .json({ success: false, reason: "Something went wrong." });
});

// ── DB → then Server ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, { ssl: true })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
