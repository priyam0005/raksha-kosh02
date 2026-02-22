// store/slices/scanSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = "https://raksha-kosh02.onrender.com";

export const fetchUserScans = createAsyncThunk(
  "scans/fetchUserScans",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("auth");
      const response = await axios.get(`${API_BASE}/scan`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Failed to fetch scans" },
      );
    }
  },
);

const scanSlice = createSlice({
  name: "scans",
  initialState: {
    scans: [],
    total: 0,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    clearScans: (state) => {
      state.scans = [];
      state.total = 0;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserScans.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserScans.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.scans = action.payload.scans;
        state.total = action.payload.total;
      })
      .addCase(fetchUserScans.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Something went wrong";
      });
  },
});

export const { clearScans } = scanSlice.actions;
export default scanSlice.reducer;
