import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "./components/providers";
import IndexPage from "./pages/index";
import NotFoundPage from "./pages/not-found";
import "./app.css";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={import.meta.env.VITE_BASE}>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
