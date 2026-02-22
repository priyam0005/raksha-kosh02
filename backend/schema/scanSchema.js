// models/Scan.js

const mongoose = require("mongoose");

const layerResultSchema = new mongoose.Schema(
  {
    layer: { type: Number, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["passed", "failed", "skipped"],
      required: true,
    },
    detail: { type: String, default: null },
  },
  { _id: false },
);

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // File identity
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileExtension: { type: String, required: true },
    mimeType: { type: String, required: true },

    // Hashes
    md5: { type: String, required: true },
    sha256: { type: String, required: true, index: true },
    sha1: { type: String, default: null },

    // Result
    status: {
      type: String,
      enum: ["clean", "failed"],
      required: true,
    },
    failedLayer: { type: Number, default: null },
    failedLayerName: { type: String, default: null },
    reason: { type: String, default: null },
    explanation: { type: String, default: null },
    failReasons: { type: Array, default: [] },

    // Layer breakdown
    layers: { type: [layerResultSchema], required: true },

    // Perf
    scanDurationMs: { type: Number, default: null },
  },
  {
    timestamps: true,
  },
);

scanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Scan", scanSchema);
