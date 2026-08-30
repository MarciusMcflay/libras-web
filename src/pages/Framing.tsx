import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "../context/CameraContext";
import { useHandLandmarker } from "../hooks/useHandLandmarker";
import { checkHandFraming } from "../utils/librasClassifier";
import { Frame, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Sparkles, Hand } from "lucide-react";

type FramingPageState = {
  statusMessage: string;
  progress: number;
  stableFrames: number;
  autoNavigated: boolean;
};

const initialPageState: FramingPageState = {
  statusMessage: "Aguardando posicionamento da mão...",
  progress: 0,
  stableFrames: 0,
  autoNavigated: false,
};

export const Framing: React.FC = () => {
  const navigate = useNavigate();
  const { cameraState } = useCamera();
  const { landmarkerState, startDetection, stopDetection } = useHandLandmarker();

  const [pageState, setPageState] = useState<FramingPageState>(initialPageState);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redireciona para a Home caso a câmera não esteja ativa
  useEffect(() => {
    if (!cameraState.hasPermission || !cameraState.stream) {
      console.warn("[Framing] Câmera não ativa. Redirecionando para a Home...");
      navigate("/");
    }
  }, [cameraState, navigate]);

  // Conecta o stream de vídeo ao elemento HTMLVideoElement
  useEffect(() => {
    if (videoRef.current && cameraState.stream) {
      videoRef.current.srcObject = cameraState.stream;
    }
  }, [cameraState.stream]);

  // Inicia o detector do MediaPipe assim que o modelo estiver pronto
  useEffect(() => {
    if (landmarkerState.isInitialized && videoRef.current) {
      console.log("[Framing] Iniciando detecção do MediaPipe...");
      startDetection(videoRef.current, canvasRef.current);
    }

    return () => {
      stopDetection();
    };
  }, [landmarkerState.isInitialized, startDetection, stopDetection]);

  // Avalia o enquadramento dos 21 pontos (incluindo o pulso) a cada frame
  useEffect(() => {
    if (pageState.autoNavigated) return;

    const framing = checkHandFraming(landmarkerState.landmarks || undefined);

    if (framing.isFramed) {
      setPageState((prev) => {
        const nextFrames = prev.stableFrames + 1;
        const nextProgress = Math.min(100, Math.round((nextFrames / 6) * 100));

        // Quando atinge 6 frames estáveis (detecção contínua do pulso + articulações)
        if (nextFrames >= 6 && !prev.autoNavigated) {
          console.log("[Framing] Mão e pulso detectados com sucesso! Navegando para /alfabeto...");
          setTimeout(() => {
            navigate("/alfabeto");
          }, 300);

          return {
            ...prev,
            statusMessage: "Enquadramento perfeito! Avançando para o Alfabeto...",
            progress: 100,
            stableFrames: nextFrames,
            autoNavigated: true,
          };
        }

        return {
          ...prev,
          statusMessage: "Mão e pulso detectados! Mantenha a posição...",
          progress: nextProgress,
          stableFrames: nextFrames,
        };
      });
    } else {
      // Reinicia contagem se a mão for removida
      setPageState((prev) => ({
        ...prev,
        statusMessage: framing.message,
        progress: framing.progress,
        stableFrames: 0,
      }));
    }
  }, [landmarkerState.landmarks, pageState.autoNavigated, navigate]);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Dynamic Background Blur */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar à Home</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
            Passo 2 de 3: Enquadramento Automático
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 flex flex-col items-center gap-6 text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            <Frame className="w-8 h-8 text-indigo-400" />
            <span>Enquadre sua Mão e Pulso</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Posicione sua mão dentro da área demarcada. Assim que todas as articulações e o pulso forem reconhecidos, você será redirecionado automaticamente.
          </p>
        </div>

        {/* Video & Canvas Frame Container */}
        <div className="relative w-full max-w-xl aspect-video rounded-3xl overflow-hidden glass-panel border border-indigo-500/30 shadow-2xl flex items-center justify-center">
          {/* Webcam Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />

          {/* MediaPipe Landmarks Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Framing Target Box Overlay */}
          <div
            className={`absolute inset-12 sm:inset-16 rounded-3xl border-2 transition-all duration-300 pointer-events-none flex flex-col items-center justify-between p-4 ${
              pageState.stableFrames > 0
                ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                : "border-indigo-500/60 border-dashed animate-scan bg-indigo-950/20"
            }`}
          >
            <div className="w-full flex justify-between text-[10px] uppercase font-mono text-indigo-300 tracking-wider">
              <span>Topo</span>
              <span>Área de Enquadramento</span>
            </div>

            {pageState.stableFrames > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Mão e Pulso Identificados!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/60 text-slate-300 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md">
                <Hand className="w-4 h-4 text-indigo-400" />
                <span>Posicione a mão aqui</span>
              </div>
            )}

            <div className="w-full flex justify-between text-[10px] uppercase font-mono text-indigo-300 tracking-wider">
              <span>Pulso Visível</span>
              <span>21 Landmarks</span>
            </div>
          </div>

          {/* Loading Overlay if Model is Loading */}
          {landmarkerState.isLoadingModel && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-indigo-300">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <p className="text-sm font-medium">Carregando IA de Visão Computacional...</p>
            </div>
          )}
        </div>

        {/* Progress Bar & Status Info */}
        <div className="w-full max-w-xl glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              {pageState.statusMessage}
            </span>
            <span className="font-mono text-indigo-400 font-bold">{pageState.progress}%</span>
          </div>

          {/* Progress Track */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${pageState.progress}%` }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-3 text-center text-xs text-slate-500">
        Transição automática ativada mediante validação de 21 pontos dos membros.
      </footer>
    </div>
  );
};
