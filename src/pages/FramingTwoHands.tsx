import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "../context/CameraContext";
import { useHandLandmarker } from "../hooks/useHandLandmarker";
import { checkTwoHandsFraming } from "../utils/librasClassifier";
import { Frame, CheckCircle2, ArrowLeft, Loader2, Sparkles, Hand } from "lucide-react";

type FramingTwoHandsPageState = {
  statusMessage: string;
  progress: number;
  stableFrames: number;
  autoNavigated: boolean;
};

const initialPageState: FramingTwoHandsPageState = {
  statusMessage: "Aguardando posicionamento de ambas as mãos...",
  progress: 0,
  stableFrames: 0,
  autoNavigated: false,
};

export const FramingTwoHands: React.FC = () => {
  const navigate = useNavigate();
  const { cameraState } = useCamera();
  const { landmarkerState, startDetection, stopDetection } = useHandLandmarker({ numHands: 2 });

  const [pageState, setPageState] = useState<FramingTwoHandsPageState>(initialPageState);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redireciona para a Home caso a câmera não esteja ativa
  useEffect(() => {
    if (!cameraState.hasPermission || !cameraState.stream) {
      console.warn("[FramingTwoHands] Câmera não ativa. Redirecionando...");
      navigate("/");
    }
  }, [cameraState, navigate]);

  // Conecta o stream de vídeo ao elemento HTMLVideoElement
  useEffect(() => {
    if (videoRef.current && cameraState.stream) {
      videoRef.current.srcObject = cameraState.stream;
    }
  }, [cameraState.stream]);

  // Inicia o detector do MediaPipe com 2 mãos
  useEffect(() => {
    if (landmarkerState.isInitialized && videoRef.current) {
      console.log("[FramingTwoHands] Iniciando detecção de 2 mãos no MediaPipe...");
      startDetection(videoRef.current, canvasRef.current);
    }

    return () => {
      stopDetection();
    };
  }, [landmarkerState.isInitialized, startDetection, stopDetection]);

  // Avalia o enquadramento bimanual (2 mãos) a cada frame
  useEffect(() => {
    if (pageState.autoNavigated) return;

    const framing = checkTwoHandsFraming(landmarkerState.landmarksList);

    if (framing.isFramed) {
      setPageState((prev) => {
        const nextFrames = prev.stableFrames + 1;
        const nextProgress = Math.min(100, Math.round((nextFrames / 6) * 100));

        if (nextFrames >= 6 && !prev.autoNavigated) {
          console.log("[FramingTwoHands] 2 Mãos enquadradas! Navegando para /sinais-duas-maos...");
          setTimeout(() => {
            navigate("/sinais-duas-maos");
          }, 300);

          return {
            ...prev,
            statusMessage: "Enquadramento bimanual perfeito! Avançando para Fase 4...",
            progress: 100,
            stableFrames: nextFrames,
            autoNavigated: true,
          };
        }

        return {
          ...prev,
          statusMessage: "Ambas as mãos detectadas! Mantenha a posição...",
          progress: nextProgress,
          stableFrames: nextFrames,
        };
      });
    } else {
      setPageState((prev) => ({
        ...prev,
        statusMessage: framing.message,
        progress: framing.progress,
        stableFrames: 0,
      }));
    }
  }, [landmarkerState.landmarksList, pageState.autoNavigated, navigate]);

  const handsCount = landmarkerState.landmarksList?.length || 0;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Dynamic Ambient Blur */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <button
          onClick={() => navigate("/alfabeto")}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Alfabeto</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Fase 4: Calibração Bimanual (2 Mãos)
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 flex flex-col items-center gap-6 text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            <Frame className="w-8 h-8 text-purple-400" />
            <span>Enquadre Suas Duas Mãos</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Para praticar os sinais da Fase 4, posicione a **Mão Esquerda** e a **Mão Direita** simultaneamente em frente à câmera.
          </p>
        </div>

        {/* Video & Canvas Frame Container */}
        <div className="relative w-full max-w-xl aspect-video rounded-3xl overflow-hidden glass-panel border border-purple-500/30 shadow-2xl flex items-center justify-center">
          {/* Webcam Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* MediaPipe Landmarks Canvas (Draws both hands!) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Framing Target Box Overlay for 2 Hands */}
          <div
            className={`absolute inset-8 sm:inset-12 rounded-3xl border-2 transition-all duration-300 pointer-events-none flex flex-col items-center justify-between p-4 ${
              pageState.stableFrames > 0
                ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "border-purple-500/60 border-dashed animate-scan bg-purple-950/20"
            }`}
          >
            <div className="w-full flex justify-between text-[10px] uppercase font-mono text-purple-300 tracking-wider">
              <span>Mão Esquerda</span>
              <span>Área de Enquadramento 2D</span>
              <span>Mão Direita</span>
            </div>

            {pageState.stableFrames > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Duas Mãos Identificadas com Sucesso!</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-700/60 text-slate-300 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md">
                <div className="flex items-center gap-1 text-purple-300">
                  <Hand className="w-4 h-4" />
                  <span>Mão 1: {handsCount >= 1 ? "✅ OK" : "❌"}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1 text-purple-300">
                  <Hand className="w-4 h-4" />
                  <span>Mão 2: {handsCount >= 2 ? "✅ OK" : "❌"}</span>
                </div>
              </div>
            )}

            <div className="w-full flex justify-between text-[10px] uppercase font-mono text-purple-300 tracking-wider">
              <span>Mãos Detectadas: {handsCount}/2</span>
              <span>MediaPipe 42 Landmarks</span>
            </div>
          </div>

          {/* Loading Overlay if Model is Loading */}
          {landmarkerState.isLoadingModel && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-purple-300">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
              <p className="text-sm font-medium">Iniciando Detector de Duas Mãos...</p>
            </div>
          )}
        </div>

        {/* Progress Bar & Status Info */}
        <div className="w-full max-w-xl glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              {pageState.statusMessage}
            </span>
            <span className="font-mono text-purple-400 font-bold">{pageState.progress}%</span>
          </div>

          {/* Progress Track */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${pageState.progress}%` }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 text-center text-xs text-slate-500">
        Calibração Bimanual MediaPipe Task Vision (Rastreamento de 42 landmarks simultâneos).
      </footer>
    </div>
  );
};
