import axios from "axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const loginUser = createAsyncThunk(
  "register/login",
  async ({ email, password }, thunkAPI) => {
    try {
      const response = await axios.post("http://localhost:911/upload/login", {
        email,
        password,
      });

      if (response && response.data && response.data.token) {
        const { token, user } = response.data;
        localStorage.setItem("auth", token);
        localStorage.setItem("user", JSON.stringify(user));
        return { user, token };
      } else {
        return thunkAPI.rejectWithValue(
          "Authentication token is missing from the server resposne",
        );
      }
    } catch (error) {
      let message =
        error.response?.data?.message || "Login failed , please try again ";

      return thunkAPI.rejectWithValue(message);
    }
  },
);

const initialState = {
  token: localStorage.getItem("auth") || null,
  loading: false,
  error: null,
  user: JSON.parse(localStorage.getItem("user")) || null,
};

const login = createSlice({
  name: "login",

  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("auth");

      localStorage.removeItem("Profile");
      localStorage.removeItem("list");
      state.loading = false;
      state.token = null;
      state.error = null;
      state.user = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "you are not authorized";
        state.token = null;
        state.user = null;
      });
  },
});

export const { logout, clearError } = login.actions;

export default login.reducer;
