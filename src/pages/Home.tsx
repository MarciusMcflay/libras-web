import React from "react";
import { useNavigate } from "react-router-dom";
import { CameraPermissionCard } from "../components/CameraPermissionCard";
import { Hand, Frame, Sparkles, ArrowRight, BookOpen } from "lucide-react";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleCameraSuccess = () => {
    navigate("/enquadramento");
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Dynamic Ambient Blur Spheres */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Hand className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Libras AI <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Shinier</span>
            </h1>
            <p className="text-xs text-slate-400">Reconhecimento Inteligente do Alfabeto Manual</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Visão Computacional MediaPipe</span>
        </div>
      </header>

      {/* Main Hero & Action Section */}
      <main className="max-w-4xl w-full mx-auto my-auto py-12 flex flex-col items-center gap-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-medium backdrop-blur-md">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Detecção em Tempo Real • Alfabeto de Libras</span>
        </div>

        {/* Title */}
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Aprenda e pratique os sinais de <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Libras interativamente</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Siga o fluxo em 3 passos simples: Ative sua câmera, faça o enquadramento automático da mão e comece a praticar os sinais do alfabeto.
          </p>
        </div>

        {/* Step Indicator Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-sm">1</span>
            <div>
              <h3 className="text-sm font-semibold text-white">Ligar Câmera</h3>
              <p className="text-xs text-slate-400 mt-1">Conceda acesso à webcam no componente abaixo.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3 opacity-80">
            <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center shrink-0 text-sm">2</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-300">Enquadramento</h3>
              <p className="text-xs text-slate-500 mt-1">O sistema valida a mão e avança sozinho.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3 opacity-80">
            <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center shrink-0 text-sm">3</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-300">Alfabeto</h3>
              <p className="text-xs text-slate-500 mt-1">Detecção em tempo real de cada sinal.</p>
            </div>
          </div>
        </div>

        {/* Camera Permission Component */}
        <CameraPermissionCard onSuccess={handleCameraSuccess} />
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Libras AI &copy; {new Date().getFullYear()} — Desenvolvido com React + Vite + MediaPipe
      </footer>
    </div>
  );
};
