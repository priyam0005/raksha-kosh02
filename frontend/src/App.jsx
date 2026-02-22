import { Outlet } from "react-router-dom";
import Header from "./component/header";
import Footer from "./component/footer";
import ScrollToTop from "./others/scrolltoTop";
import "./App.css";

function App() {
  return (
    <>
      <ScrollToTop />
      <Header />

      <div className="bg-slate-900">
        <Outlet />
      </div>

      <Footer />
    </>
  );
}

export default App;
