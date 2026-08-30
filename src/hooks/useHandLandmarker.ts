import { useState, useEffect, useRef, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Landmark } from "../utils/librasClassifier";

export type LandmarkerState = {
  isInitialized: boolean;
  isLoadingModel: boolean;
  isDetecting: boolean;
  error: string | null;
  landmarks: Landmark[] | null;
  landmarksList: Landmark[][] | null;
};

const initialLandmarkerState: LandmarkerState = {
  isInitialized: false,
  isLoadingModel: false,
  isDetecting: false,
  error: null,
  landmarks: null,
  landmarksList: null,
};

// Mapeamento de cores e nomes para os 21 pontos dos dedos (do centro/base para a ponta)
const LANDMARK_STYLE_MAP: Record<number, { color: string; textColor: string }> = {
  // 0: Pulso (Preto)
  0: { color: "#000000", textColor: "#ffffff" },

  // Polegar (Vermelho: 1 claro -> 4 escuro/intenso)
  1: { color: "#fca5a5", textColor: "#000000" },
  2: { color: "#f87171", textColor: "#ffffff" },
  3: { color: "#ef4444", textColor: "#ffffff" },
  4: { color: "#991b1b", textColor: "#ffffff" }, // Ponta do polegar

  // Indicador (Verde: 5 claro -> 8 escuro/intenso)
  5: { color: "#86efac", textColor: "#000000" },
  6: { color: "#4ade80", textColor: "#000000" },
  7: { color: "#22c55e", textColor: "#ffffff" },
  8: { color: "#166534", textColor: "#ffffff" }, // Ponta do indicador

  // Dedo do Meio / Médio (Azul: 9 claro -> 12 escuro/intenso)
  9: { color: "#93c5fd", textColor: "#000000" },
  10: { color: "#60a5fa", textColor: "#000000" },
  11: { color: "#3b82f6", textColor: "#ffffff" },
  12: { color: "#1e40af", textColor: "#ffffff" }, // Ponta do médio

  // Anelar (Laranja/Amarelo: 13 claro -> 16 escuro/intenso)
  13: { color: "#fef08a", textColor: "#000000" },
  14: { color: "#facc15", textColor: "#000000" },
  15: { color: "#f97316", textColor: "#ffffff" },
  16: { color: "#9a3412", textColor: "#ffffff" }, // Ponta do anelar

  // Dedo Mínimo (Roxo/Rosa: 17 claro -> 20 escuro/intenso)
  17: { color: "#f5d0fe", textColor: "#000000" },
  18: { color: "#e879f9", textColor: "#000000" },
  19: { color: "#c084fc", textColor: "#ffffff" },
  20: { color: "#6b21a8", textColor: "#ffffff" }, // Ponta do mínimo
};

type UseHandLandmarkerOptions = {
  numHands?: number;
};

export function useHandLandmarker(options?: UseHandLandmarkerOptions) {
  const numHands = options?.numHands ?? 1;

  const [landmarkerState, setLandmarkerState] = useState<LandmarkerState>(initialLandmarkerState);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Inicializa o modelo MediaPipe HandLandmarker
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      setLandmarkerState((prev) => ({
        ...prev,
        isLoadingModel: true,
        error: null,
      }));

      try {
        console.log(`[MediaPipe] Carregando arquivos WASM do CDN (numHands: ${numHands})...`);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (!isMounted) return;

        console.log("[MediaPipe] Criando HandLandmarker...");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: numHands,
        });

        if (!isMounted) return;

        handLandmarkerRef.current = landmarker;

        setLandmarkerState({
          isInitialized: true,
          isLoadingModel: false,
          isDetecting: false,
          error: null,
          landmarks: null,
          landmarksList: null,
        });

        console.log("[MediaPipe] Modelo HandLandmarker carregado com sucesso!");
      } catch (err: any) {
        console.error("[MediaPipe] Erro ao carregar o modelo:", err);
        if (isMounted) {
          setLandmarkerState((prev) => ({
            ...prev,
            isInitialized: false,
            isLoadingModel: false,
            error: `Erro ao carregar detector de mãos: ${err.message || "Falha na conexão"}`,
          }));
        }
      }
    }

    void initMediaPipe();

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [numHands]);

  // Desenha os 21 pontos numerados e coloridos no Canvas para todas as mãos detectadas
  const drawLandmarks = useCallback(
    (allHands: Landmark[][], canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Conexões das articulações dos dedos
      const CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],     // Polegar
        [0, 5], [5, 6], [6, 7], [7, 8],     // Indicador
        [5, 9], [9, 10], [10, 11], [11, 12], // Médio
        [9, 13], [13, 14], [14, 15], [15, 16], // Anelar
        [13, 17], [17, 18], [18, 19], [19, 20], // Mínimo
        [0, 17] // Palma
      ];

      for (const landmarks of allHands) {
        if (!landmarks || landmarks.length < 21) continue;

        // Desenhar linhas conectoras suaves
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2.5;
        for (const [start, end] of CONNECTIONS) {
          const p1 = landmarks[start];
          const p2 = landmarks[end];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          }
        }

        // Desenhar os 21 pontos (landmarks) numerados e coloridos por intensidade
        for (let i = 0; i < landmarks.length; i++) {
          const pt = landmarks[i];
          const cx = pt.x * canvas.width;
          const cy = pt.y * canvas.height;
          const style = LANDMARK_STYLE_MAP[i] || { color: "#ffffff", textColor: "#000000" };

          const radius = i === 0 ? 11 : 9.5;

          // Círculo base da bolinha
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fillStyle = style.color;
          ctx.fill();

          // Borda preta/branca para contraste
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = i === 0 ? "#ffffff" : "#000000";
          ctx.stroke();

          // Desenhar o NÚMERO DO LANDMARK no centro da bolinha
          ctx.fillStyle = style.textColor;
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(i.toString(), cx, cy + 0.5);
        }
      }
    },
    []
  );

  // Inicia o loop contínuo de detecção de vídeo
  const startDetection = useCallback(
    (videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement | null) => {
      if (!handLandmarkerRef.current) {
        console.warn("[MediaPipe] Tentativa de iniciar detecção sem o modelo pronto.");
        return;
      }

      setLandmarkerState((prev) => ({
        ...prev,
        isDetecting: true,
      }));

      function detectFrame() {
        if (!videoElement || videoElement.paused || videoElement.ended) {
          animFrameIdRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        const currentTime = videoElement.currentTime;
        if (currentTime !== lastVideoTimeRef.current && handLandmarkerRef.current) {
          lastVideoTimeRef.current = currentTime;

          try {
            const results = handLandmarkerRef.current.detectForVideo(
              videoElement,
              performance.now()
            );

            if (results.landmarks && results.landmarks.length > 0) {
              const allHands = results.landmarks as Landmark[][];
              setLandmarkerState((prev) => ({
                ...prev,
                landmarks: allHands[0],
                landmarksList: allHands,
              }));

              if (canvasElement) {
                drawLandmarks(allHands, canvasElement, videoElement);
              }
            } else {
              setLandmarkerState((prev) => ({
                ...prev,
                landmarks: null,
                landmarksList: null,
              }));

              if (canvasElement) {
                const ctx = canvasElement.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              }
            }
          } catch (err: any) {
            console.error("[MediaPipe] Erro durante a detecção do frame:", err);
          }
        }

        animFrameIdRef.current = requestAnimationFrame(detectFrame);
      }

      animFrameIdRef.current = requestAnimationFrame(detectFrame);
    },
    [drawLandmarks]
  );

  const stopDetection = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setLandmarkerState((prev) => ({
      ...prev,
      isDetecting: false,
      landmarks: null,
      landmarksList: null,
    }));
  }, []);

  return {
    landmarkerState,
    startDetection,
    stopDetection,
  };
}

