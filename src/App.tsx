import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CameraProvider } from "./context/CameraContext";
import { Home } from "./pages/Home";
import { Framing } from "./pages/Framing";
import { Alphabet } from "./pages/Alphabet";

export const App: React.FC = () => {
  return (
    <CameraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/enquadramento" element={<Framing />} />
          <Route path="/alfabeto" element={<Alphabet />} />
        </Routes>
      </BrowserRouter>
    </CameraProvider>
  );
};

export default App;
