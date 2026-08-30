import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "../context/CameraContext";
import { useHandLandmarker } from "../hooks/useHandLandmarker";
import { classifyTwoHandSign, TwoHandSignResult } from "../utils/librasClassifier";
import { ArrowLeft, CheckCircle2, Sparkles, BookOpen, GraduationCap, School, Library, Award, Users, Bookmark, Check } from "lucide-react";

type TwoHandSignsState = {
  currentDetection: TwoHandSignResult;
  completedSigns: string[];
};

const initialState: TwoHandSignsState = {
  currentDetection: {
    signName: "-",
    confidence: 0,
    description: "Faça um dos sinais bimanuais da educação em frente à câmera",
    isFramed: false,
    handsCount: 0,
  },
  completedSigns: [],
};

type TwoHandSignGuideItem = {
  id: string;
  name: string;
  category: string;
  tip: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Sinais Bimanuais Educacionais para a Moldura Periférica
const EDUCATIONAL_SIGNS: TwoHandSignGuideItem[] = [
  {
    id: "LIVRO",
    name: "LIVRO",
    category: "Educação",
    tip: "Mãos com palmas viradas para cima tocando pelas laterais internas, abrindo como um livro.",
    icon: BookOpen,
  },
  {
    id: "ESTUDAR",
    name: "ESTUDAR",
    category: "Ação",
    tip: "Palma da mão direita sobre a palma esquerda realizando leves toques ritmados.",
    icon: GraduationCap,
  },
  {
    id: "ESCOLA",
    name: "ESCOLA",
    category: "Local",
    tip: "Pontas dos dedos de ambas as mãos unidas no topo formando a estrutura de um telhado.",
    icon: School,
  },
  {
    id: "PROFESSOR",
    name: "PROFESSOR",
    category: "Pessoas",
    tip: "Mãos com a letra F ou P na altura do tórax movendo para frente em paralelo.",
    icon: Users,
  },
  {
    id: "APRENDER",
    name: "APRENDER",
    category: "Ação",
    tip: "Mão aberta aproximando e fechando em C no peito ou testa.",
    icon: Award,
  },
  {
    id: "BIBLIOTECA",
    name: "BIBLIOTECA",
    category: "Local",
    tip: "Duas mãos em letra B girando suavemente em arcos paralelos.",
    icon: Library,
  },
  {
    id: "ALUNO",
    name: "ALUNO",
    category: "Pessoas",
    tip: "Mão com letra A no peito com movimento suave bimanual.",
    icon: Bookmark,
  },
  {
    id: "AULA",
    name: "AULA",
    category: "Educação",
    tip: "Duas mãos em V ou C desenhando um grande círculo no ar em conjunto.",
    icon: GraduationCap,
  },
];

type PlacedSignCell = {
  item: TwoHandSignGuideItem;
  gridCol: number;
  gridRow: number;
  position: "TOP" | "RIGHT" | "BOTTOM" | "LEFT";
};

// Calcula a grade matemática de perímetro 2D para a moldura periférica da Fase 4
function calculateTwoHandPerimeterGrid(isLandscape: boolean): {
  cols: number;
  rows: number;
  placedCells: PlacedSignCell[];
} {
  const cols = isLandscape ? 5 : 4;
  const rows = isLandscape ? 4 : 5;

  const placedCells: PlacedSignCell[] = [];
  let itemIdx = 0;

  // 1. Topo (Row 1): Colunas 1 até cols
  for (let c = 1; c <= cols; c++) {
    if (itemIdx < EDUCATIONAL_SIGNS.length) {
      placedCells.push({
        item: EDUCATIONAL_SIGNS[itemIdx++],
        gridCol: c,
        gridRow: 1,
        position: "TOP",
      });
    }
  }

  // 2. Coluna Direita: Coluna cols, Linhas 2 até (rows - 1)
  for (let r = 2; r <= rows - 1; r++) {
    if (itemIdx < EDUCATIONAL_SIGNS.length) {
      placedCells.push({
        item: EDUCATIONAL_SIGNS[itemIdx++],
        gridCol: cols,
        gridRow: r,
        position: "RIGHT",
      });
    }
  }

  // 3. Base (Row rows): Colunas cols até 1 (sentido inverso)
  for (let c = cols; c >= 1; c--) {
    if (itemIdx < EDUCATIONAL_SIGNS.length) {
      placedCells.push({
        item: EDUCATIONAL_SIGNS[itemIdx++],
        gridCol: c,
        gridRow: rows,
        position: "BOTTOM",
      });
    }
  }

  // 4. Coluna Esquerda: Coluna 1, Linhas (rows - 1) até 2 (sentido inverso)
  for (let r = rows - 1; r >= 2; r--) {
    if (itemIdx < EDUCATIONAL_SIGNS.length) {
      placedCells.push({
        item: EDUCATIONAL_SIGNS[itemIdx++],
        gridCol: 1,
        gridRow: r,
        position: "LEFT",
      });
    }
  }

  return { cols, rows, placedCells };
}

export const TwoHandSigns: React.FC = () => {
  const navigate = useNavigate();
  const { cameraState } = useCamera();
  const { landmarkerState, startDetection, stopDetection } = useHandLandmarker({ numHands: 2 });

  const [state, setState] = useState<TwoHandSignsState>(initialState);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth >= window.innerHeight);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitora redimensionamento da tela
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth >= window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Redireciona se câmera não estiver conectada
  useEffect(() => {
    if (!cameraState.hasPermission || !cameraState.stream) {
      console.warn("[TwoHandSigns] Câmera não ativa. Redirecionando...");
      navigate("/");
    }
  }, [cameraState, navigate]);

  // Conecta stream ao elemento video
  useEffect(() => {
    if (videoRef.current && cameraState.stream) {
      videoRef.current.srcObject = cameraState.stream;
    }
  }, [cameraState.stream]);

  // Inicia detecção do MediaPipe com 2 mãos
  useEffect(() => {
    if (landmarkerState.isInitialized && videoRef.current) {
      startDetection(videoRef.current, canvasRef.current);
    }

    return () => {
      stopDetection();
    };
  }, [landmarkerState.isInitialized, startDetection, stopDetection]);

  // Avalia sinais bimanuais a cada alteração nos landmarks das 2 mãos
  useEffect(() => {
    if (!landmarkerState.landmarksList || landmarkerState.landmarksList.length < 2) {
      setState((prev) => ({
        ...prev,
        currentDetection: {
          signName: "-",
          confidence: 0,
          description: "Posicione ambas as mãos em frente à câmera",
          isFramed: false,
          handsCount: landmarkerState.landmarksList?.length || 0,
        },
      }));
      return;
    }

    const detection = classifyTwoHandSign(landmarkerState.landmarksList);

    setState((prev) => {
      const isKnownSign = EDUCATIONAL_SIGNS.some((s) => s.id === detection.signName);
      const isNewSign =
        isKnownSign &&
        detection.confidence >= 0.70 &&
        !prev.completedSigns.includes(detection.signName);

      return {
        currentDetection: detection,
        completedSigns: isNewSign
          ? [...prev.completedSigns, detection.signName]
          : prev.completedSigns,
      };
    });
  }, [landmarkerState.landmarksList]);

  const { cols, rows, placedCells } = calculateTwoHandPerimeterGrid(isLandscape);

  return (
    <div className="h-screen w-screen bg-[#090d16] text-white overflow-hidden select-none relative p-1.5">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* UNIFIED 2D PERIMETER GRID CONTAINER */}
      <div
        className="w-full h-full grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {/* NÚCLEO CENTRAL: Câmera + Feedback */}
        <div
          className="bg-slate-950/80 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden backdrop-blur-md flex flex-col justify-between p-3 z-10 m-1"
          style={{
            gridColumnStart: 2,
            gridColumnEnd: cols,
            gridRowStart: 2,
            gridRowEnd: rows,
          }}
        >
          {/* Header Central */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 z-10 flex-shrink-0">
            <button
              onClick={() => navigate("/enquadramento-duas-maos")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition-colors shadow-md"
            >
              <ArrowLeft className="w-4 h-4 text-purple-400" />
              <span>Voltar ao Enquadramento Bimanual</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Fase 4: Sinais Bimanuais da Educação
              </span>

              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-purple-500/30 text-emerald-300 font-mono font-medium shadow-md">
                {state.completedSigns.length}/{EDUCATIONAL_SIGNS.length} Feitos
              </span>
            </div>
          </div>

          {/* Feed de Câmera Central com Overlays */}
          <div className="flex-1 relative w-full h-full rounded-2xl overflow-hidden border border-purple-500/30 bg-black shadow-2xl flex items-center justify-center my-1.5">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
            />

            {/* Badge de Status de Duas Mãos */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-purple-500/50 px-3 py-1.5 rounded-full text-xs text-purple-300 font-mono z-20 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>MediaPipe: {state.currentDetection.handsCount}/2 Mãos</span>
            </div>

            {/* Overlay do Sinal Detectado */}
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-3 bg-slate-950/95 backdrop-blur-md p-2.5 rounded-2xl border border-purple-500/50 shadow-2xl max-w-sm">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-purple-600/40 border border-white/20 animate-pulse text-center px-1">
                {state.currentDetection.signName}
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sinal Bimanual Detectado
                </span>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <span className="text-purple-300 font-semibold">
                    {Math.round(state.currentDetection.confidence * 100)}% Confiança
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé Central Explicativo */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center z-10 flex-shrink-0 shadow-md">
            <p className="text-xs font-semibold text-slate-200 leading-snug">
              {state.currentDetection.description}
            </p>
          </div>
        </div>

        {/* CÉLULAS DA MOLDURA PERIMETRAL DE SINAIS BIMANUAIS */}
        {placedCells.map(({ item, gridCol, gridRow, position }) => {
          const isActive = state.currentDetection.signName === item.id;
          const isCompleted = state.completedSigns.includes(item.id);
          const IconComponent = item.icon;

          const tooltipPositionClass =
            position === "TOP"
              ? "top-full mt-2 left-1/2 -translate-x-1/2"
              : position === "RIGHT"
              ? "right-full mr-2 top-1/2 -translate-y-1/2"
              : position === "BOTTOM"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "left-full ml-2 top-1/2 -translate-y-1/2";

          return (
            <div
              key={item.id}
              style={{
                gridColumnStart: gridCol,
                gridRowStart: gridRow,
              }}
              className={`relative flex flex-col items-center justify-between p-2 transition-all duration-300 border border-slate-800/80 group w-full h-full rounded-2xl overflow-visible ${
                isActive
                  ? "bg-gradient-to-b from-purple-900/95 to-pink-950/95 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.7)] scale-105 z-40 ring-2 ring-purple-400"
                  : isCompleted
                  ? "bg-emerald-950/40 border-emerald-500/40"
                  : "bg-slate-950/90 hover:bg-slate-900"
              }`}
            >
              {/* Header do Cartão */}
              <div className="w-full flex items-center justify-between px-1 mb-1">
                <span
                  className={`text-xs font-black tracking-wider ${
                    isActive
                      ? "text-purple-300 animate-bounce"
                      : isCompleted
                      ? "text-emerald-400"
                      : "text-slate-200"
                  }`}
                >
                  {item.name}
                </span>

                {isActive ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                ) : isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : null}
              </div>

              {/* Ícone Representativo Grande */}
              <div className="w-full flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-purple-400 group-hover:text-purple-300 transition-colors">
                <IconComponent className="w-8 h-8" />
                <span className="text-[10px] text-slate-400 mt-1 uppercase font-mono font-medium">
                  {item.category}
                </span>
              </div>

              {/* Balão Explicativo ao passar o mouse */}
              <div
                className={`absolute hidden group-hover:block ${
                  isActive ? "!block" : ""
                } ${tooltipPositionClass} w-56 p-3 rounded-2xl bg-slate-950 border border-purple-500/50 text-xs text-slate-200 text-center shadow-2xl z-50 pointer-events-none backdrop-blur-md`}
              >
                <p className="font-bold text-purple-300 mb-1 flex items-center justify-center gap-1.5">
                  <IconComponent className="w-4 h-4 text-purple-400" />
                  <span>Sinal {item.name}</span>
                </p>
                <p className="leading-snug text-slate-300 text-[11px]">{item.tip}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
