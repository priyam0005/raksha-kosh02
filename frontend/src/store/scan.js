// src/store/scanSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = "http://localhost:911";

export const uploadFileThunk = createAsyncThunk(
  "scan/uploadFile",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",

          ...(localStorage.getItem("auth") && {
            Authorization: `Bearer ${localStorage.getItem("auth")}`,
          }),
        },
      });

      // 2xx — file passed all layers
      return response.data;
    } catch (error) {
      const data = error.response?.data;

      if (data) {
        return rejectWithValue(data);
      }

      // Pure network / CORS error — no backend response
      return rejectWithValue({ error: error.message });
    }
  },
);

// ─── Initial state ────────────────────────────────────────────────────────────
const initialState = {
  status: "idle",
  file: null,
  result: null,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const scanSlice = createSlice({
  name: "scan",
  initialState,

  reducers: {
    setFile(state, action) {
      state.file = action.payload;
      state.error = null;
    },
    resetScan() {
      return { ...initialState };
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(uploadFileThunk.pending, (state) => {
        state.status = "scanning";
        state.result = null;
        state.error = null;
      })

      .addCase(uploadFileThunk.fulfilled, (state, action) => {
        state.status = "result";
        state.result = action.payload;
        state.error = null;
      })

      .addCase(uploadFileThunk.rejected, (state, action) => {
        state.status = "result";

        const payload = action.payload;

        if (payload && (payload.layerCaught || payload.reason)) {
          state.result = {
            success: false,
            layerCaught: payload.layerCaught || null,
            scanLabel: payload.scanLabel || "",
            reason: payload.reason || "",
            explanation: payload.explanation || "",
            detail: payload.detail || null,
            failReasons: payload.failReasons || [],
            message: payload.reason || "File rejected.",
          };
          state.error = null;
        } else {
          // Case B — pure network / server crash
          state.result = null;
          state.error = payload?.error || "Network error. Please try again.";
        }
      });
  },
});

export const { setFile, resetScan } = scanSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectStatus = (state) => state.scan.status;
export const selectFile = (state) => state.scan.file;
export const selectResult = (state) => state.scan.result;
export const selectError = (state) => state.scan.error;

export default scanSlice.reducer;
