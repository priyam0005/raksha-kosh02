import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Home from "./component/home.jsx";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import Header from "./component/header.jsx";
import Login from "./component/login.jsx";
import Register from "./component/Register.jsx";
import { motion } from "framer-motion";
import store from "./store/index.js";
import Profile from "./component/profile.jsx";
import About from "./component/about.jsx";
import TermsPage from "./component/terms.jsx";

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,

    children: [
      {
        path: "/",
        element: (
          <PageWrapper>
            <Home />
          </PageWrapper>
        ),
      },
      {
        path: "/profile",
        element: (
          <PageWrapper>
            <Profile />
          </PageWrapper>
        ),
      },
      {
        path: "/about",
        element: (
          <PageWrapper>
            {" "}
            <About />
          </PageWrapper>
        ),
      },
      {
        path: "/terms",
        element: (
          <PageWrapper>
            {" "}
            <TermsPage />
          </PageWrapper>
        ),
      },
    ],
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
