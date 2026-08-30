import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "../context/CameraContext";
import { useHandLandmarker } from "../hooks/useHandLandmarker";
import { classifyLibrasSign, HandDetectionResult } from "../utils/librasClassifier";
import { ArrowLeft, CheckCircle2, ArrowUp, ArrowDown, Sparkles, ArrowRight, Trophy } from "lucide-react";
import alfabetoImage from "../assets/alfabeto_libra-pt-Br.jpg";

type AlphabetState = {
  currentDetection: HandDetectionResult;
  completedLetters: string[];
};

const initialAlphabetState: AlphabetState = {
  currentDetection: {
    letter: "-",
    confidence: 0,
    description: "Faça um sinal de Libras em frente à câmera",
    isFramed: false,
    landmarksCount: 0,
    orientation: "UP",
  },
  completedLetters: [],
};

type AlphabetGuideItem = {
  char: string;
  row: number;
  col: number;
  name: string;
  tip: string;
};

// Mapeamento em grade 2D (5 colunas x 5 linhas) da imagem de referência
const ALPHABET_ITEMS: AlphabetGuideItem[] = [
  { char: "A", row: 0, col: 0, name: "Letra A", tip: "Polegar esticado para CIMA fora da palma da mão." },
  { char: "B", row: 0, col: 1, name: "Letra B", tip: "Quatro dedos para CIMA e polegar recolhido." },
  { char: "C", row: 0, col: 2, name: "Letra C", tip: "Quatro dedos em arco paralelos ao polegar." },
  { char: "D", row: 0, col: 3, name: "Letra D", tip: "Indicador estendido para CIMA e anel na base." },
  { char: "E", row: 0, col: 4, name: "Letra E", tip: "Falanges dobradas com polegar dentro da palma." },
  { char: "F", row: 1, col: 0, name: "Letra F", tip: "3 dedos para CIMA; indicador e polegar em pinça." },
  { char: "G", row: 1, col: 1, name: "Letra G", tip: "Mão de lado, indicador e polegar horizontais paralelos." },
  { char: "H", row: 1, col: 2, name: "Letra H", tip: "Indicador e médio esticados na HORIZONTAL de lado." },
  { char: "I", row: 1, col: 3, name: "Letra I", tip: "Apenas o dedo mínimo estendido para CIMA." },
  { char: "J", row: 1, col: 4, name: "Letra J", tip: "Mínimo estendido desenhando movimento J no ar." },
  { char: "K", row: 2, col: 0, name: "Letra K", tip: "Indicador e médio de lado, médio à esquerda." },
  { char: "L", row: 2, col: 1, name: "Letra L", tip: "Indicador para CIMA e polegar aberto a 90°." },
  { char: "M", row: 2, col: 2, name: "Letra M", tip: "Três dedos (indicador, médio, anelar) para BAIXO." },
  { char: "N", row: 2, col: 3, name: "Letra N", tip: "Apenas indicador e médio apontados para BAIXO." },
  { char: "O", row: 2, col: 4, name: "Letra O", tip: "Pontas dos dedos encostadas no polegar em anel." },
  { char: "P", row: 3, col: 0, name: "Letra P", tip: "Mão de FRENTE, indicador horizontal e médio p/ frente." },
  { char: "Q", row: 3, col: 1, name: "Letra Q", tip: "Indicador e polegar estendidos para BAIXO." },
  { char: "R", row: 3, col: 2, name: "Letra R", tip: "Indicador e médio estendidos cruzados de frente." },
  { char: "S", row: 3, col: 3, name: "Letra S", tip: "Punho fechado e polegar cruzando até o anelar." },
  { char: "T", row: 3, col: 4, name: "Letra T", tip: "Figas: polegar enfiado entre indicador e médio." },
  { char: "U", row: 4, col: 0, name: "Letra U", tip: "Indicador e médio paralelos para CIMA." },
  { char: "V", row: 4, col: 0, name: "Letra V", tip: "Indicador e médio bem afastados em V." },
  { char: "W", row: 4, col: 1, name: "Letra W", tip: "Três dedos (indicador, médio, anelar) para CIMA." },
  { char: "X", row: 4, col: 2, name: "Letra X", tip: "Indicador dobrado em gancho para CIMA." },
  { char: "Y", row: 4, col: 3, name: "Letra Y", tip: "Polegar e mínimo estendidos para os lados (Hang Loose)." },
  { char: "Z", row: 4, col: 4, name: "Letra Z", tip: "Indicador estendido desenhando Z no ar." },
];

type PlacedLetterCell = {
  item: AlphabetGuideItem;
  gridCol: number; // 1-indexed para CSS Grid
  gridRow: number; // 1-indexed para CSS Grid
  position: "TOP" | "RIGHT" | "BOTTOM" | "LEFT";
};

// Algoritmo Matemático de Perímetro 2D: C + R = 15
function calculatePerimeterGrid(isLandscape: boolean): {
  cols: number;
  rows: number;
  placedCells: PlacedLetterCell[];
} {
  const cols = isLandscape ? 9 : 6;
  const rows = isLandscape ? 6 : 9;

  const placedCells: PlacedLetterCell[] = [];
  let itemIdx = 0;

  // 1. Topo (Row 1): Colunas 1 até cols
  for (let c = 1; c <= cols; c++) {
    if (itemIdx < ALPHABET_ITEMS.length) {
      placedCells.push({
        item: ALPHABET_ITEMS[itemIdx++],
        gridCol: c,
        gridRow: 1,
        position: "TOP",
      });
    }
  }

  // 2. Coluna Direita: Coluna cols, Linhas 2 até (rows - 1)
  for (let r = 2; r <= rows - 1; r++) {
    if (itemIdx < ALPHABET_ITEMS.length) {
      placedCells.push({
        item: ALPHABET_ITEMS[itemIdx++],
        gridCol: cols,
        gridRow: r,
        position: "RIGHT",
      });
    }
  }

  // 3. Base (Row rows): Colunas cols até 1 (sentido inverso)
  for (let c = cols; c >= 1; c--) {
    if (itemIdx < ALPHABET_ITEMS.length) {
      placedCells.push({
        item: ALPHABET_ITEMS[itemIdx++],
        gridCol: c,
        gridRow: rows,
        position: "BOTTOM",
      });
    }
  }

  // 4. Coluna Esquerda: Coluna 1, Linhas (rows - 1) até 2 (sentido inverso)
  for (let r = rows - 1; r >= 2; r--) {
    if (itemIdx < ALPHABET_ITEMS.length) {
      placedCells.push({
        item: ALPHABET_ITEMS[itemIdx++],
        gridCol: 1,
        gridRow: r,
        position: "LEFT",
      });
    }
  }

  return { cols, rows, placedCells };
}

export const Alphabet: React.FC = () => {
  const navigate = useNavigate();
  const { cameraState } = useCamera();
  const { landmarkerState, startDetection, stopDetection } = useHandLandmarker({ numHands: 1 });

  const [alphabetState, setAlphabetState] = useState<AlphabetState>(initialAlphabetState);
  const [isLandscape, setIsLandscape] = useState<boolean>(window.innerWidth >= window.innerHeight);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitora o dimensionamento/orientação da janela dinamicamente
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth >= window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Redireciona para a Home caso a câmera perca o stream
  useEffect(() => {
    if (!cameraState.hasPermission || !cameraState.stream) {
      console.warn("[Alphabet] Câmera desconectada. Redirecionando...");
      navigate("/");
    }
  }, [cameraState, navigate]);

  // Conecta o vídeo ao stream
  useEffect(() => {
    if (videoRef.current && cameraState.stream) {
      videoRef.current.srcObject = cameraState.stream;
    }
  }, [cameraState.stream]);

  // Inicia detecção do MediaPipe
  useEffect(() => {
    if (landmarkerState.isInitialized && videoRef.current) {
      startDetection(videoRef.current, canvasRef.current);
    }

    return () => {
      stopDetection();
    };
  }, [landmarkerState.isInitialized, startDetection, stopDetection]);

  // Executa o classificador de sinais a cada alteração nos landmarks e contabiliza letras concluídas
  useEffect(() => {
    if (!landmarkerState.landmarks || landmarkerState.landmarks.length < 21) {
      setAlphabetState((prev) => ({
        ...prev,
        currentDetection: {
          letter: "-",
          confidence: 0,
          description: "Posicione a mão em frente à câmera",
          isFramed: false,
          landmarksCount: 0,
          orientation: "UP",
        },
      }));
      return;
    }

    const detection = classifyLibrasSign(landmarkerState.landmarks);

    setAlphabetState((prev) => {
      const isKnownChar = ALPHABET_ITEMS.some((item) => item.char === detection.letter);
      const isNewLetter =
        isKnownChar &&
        detection.confidence >= 0.70 &&
        !prev.completedLetters.includes(detection.letter);

      return {
        currentDetection: detection,
        completedLetters: isNewLetter
          ? [...prev.completedLetters, detection.letter]
          : prev.completedLetters,
      };
    });
  }, [landmarkerState.landmarks]);

  // Calcula a grade matemática dinâmica de 26 células no anel externo
  const { cols, rows, placedCells } = calculatePerimeterGrid(isLandscape);

  const isPhase4Unlocked = alphabetState.completedLetters.length >= 4;

  return (
    <div className="h-screen w-screen bg-[#090d16] text-white overflow-hidden select-none relative p-1">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* UNIFIED 2D PERIMETER GRID CONTAINER */}
      <div
        className="w-full h-full grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {/* NÚCLEO CENTRAL ADAPTATIVO: Ocupa exatamente da Coluna 2 até (cols-1) e da Linha 2 até (rows-1) */}
        <div
          className="bg-slate-950/80 rounded-2xl border border-indigo-500/30 shadow-2xl overflow-hidden backdrop-blur-md flex flex-col justify-between p-2.5 z-10 m-1"
          style={{
            gridColumnStart: 2,
            gridColumnEnd: cols,
            gridRowStart: 2,
            gridRowEnd: rows,
          }}
        >
          {/* Header Central: Voltar + Progresso + Botão Desbloqueio Fase 4 */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 z-10 flex-shrink-0 gap-2">
            <button
              onClick={() => navigate("/enquadramento")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 transition-colors shadow-md"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Voltar ao Enquadramento</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Contador de Letras Feitas */}
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 font-medium flex items-center gap-1.5 shadow-md">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Letras Feitas: {alphabetState.completedLetters.length}/4</span>
              </span>

              {/* Botão de Avançar para Fase 4 quando desbloqueado (>= 4 letras) */}
              {isPhase4Unlocked ? (
                <button
                  onClick={() => navigate("/enquadramento-duas-maos")}
                  className="flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 border border-emerald-400/50 transition-transform active:scale-95 animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ir para Fase 4 (2 Mãos)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Fase 3: Detecção de Letras
                </span>
              )}
            </div>
          </div>

          {/* Câmera Feed Adaptativa no Centro */}
          <div className="flex-1 relative w-full h-full rounded-2xl overflow-hidden border border-indigo-500/30 bg-black shadow-2xl flex items-center justify-center my-1">
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

            {/* Status Badge no Canto Superior Esquerdo */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] text-indigo-300 font-mono z-20 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>MediaPipe 21 Landmarks</span>
            </div>

            {/* Orientation Badge no Canto Superior Direito */}
            {alphabetState.currentDetection.landmarksCount > 0 && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] font-semibold z-20 shadow-lg">
                {alphabetState.currentDetection.orientation === "DOWN" ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" />
                    Pulso p/ Cima
                  </span>
                ) : (
                  <span className="text-indigo-300 flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    Pulso p/ Baixo
                  </span>
                )}
              </div>
            )}

            {/* OVERLAY COMPACTO DA LETRA DETECTADA NO CANTO INFERIOR ESQUERDO DO VÍDEO */}
            <div className="absolute bottom-2.5 left-2.5 z-30 flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-indigo-500/50 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 border border-white/20 animate-pulse">
                {alphabetState.currentDetection.letter}
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Letra Detectada
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                  <span className="text-indigo-300 font-semibold">
                    {Math.round(alphabetState.currentDetection.confidence * 100)}%
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    {alphabetState.currentDetection.landmarksCount}/21 pts
                  </span>
                </div>
              </div>
            </div>

            {/* BANNER FLUTUANTE SE FASE 4 ESTIVER DESBLOQUEADA */}
            {isPhase4Unlocked && (
              <div className="absolute bottom-2.5 right-2.5 z-30 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold text-emerald-200">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Fase 4 Desbloqueada! Clique no botão no topo para avançar.</span>
              </div>
            )}
          </div>

          {/* Rodapé Central com a Descrição Anatômica Atual */}
          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center z-10 flex-shrink-0 shadow-md">
            <p className="text-xs font-semibold text-slate-200 leading-snug">
              {alphabetState.currentDetection.description}
            </p>
          </div>
        </div>

        {/* AS 26 CÉLULAS DA MOLDURA PERIMETRAL ALOCADAS NA GRADE 2D UNIFICADA */}
        {placedCells.map(({ item, gridCol, gridRow, position }) => {
          const isActive = alphabetState.currentDetection.letter === item.char;
          const isCompleted = alphabetState.completedLetters.includes(item.char);

          const imageStyle: React.CSSProperties =
            item.char === "U"
              ? {
                  width: "1000%",
                  height: "500%",
                  top: "-400%",
                  left: "0%",
                  objectFit: "fill",
                }
              : item.char === "V"
              ? {
                  width: "1000%",
                  height: "500%",
                  top: "-400%",
                  left: "-100%",
                  objectFit: "fill",
                }
              : {
                  width: "500%",
                  height: "500%",
                  top: `-${item.row * 100}%`,
                  left: `-${item.col * 100}%`,
                  objectFit: "fill",
                };

          const tooltipPositionClass =
            position === "TOP"
              ? "top-full mt-1.5 left-1/2 -translate-x-1/2"
              : position === "RIGHT"
              ? "right-full mr-1.5 top-1/2 -translate-y-1/2"
              : position === "BOTTOM"
              ? "bottom-full mb-1.5 left-1/2 -translate-x-1/2"
              : "left-full ml-1.5 top-1/2 -translate-y-1/2";

          return (
            <div
              key={item.char}
              style={{
                gridColumnStart: gridCol,
                gridRowStart: gridRow,
              }}
              className={`relative flex flex-col items-center justify-between p-1 transition-all duration-300 border border-slate-800/80 group w-full h-full min-h-[50px] overflow-visible ${
                isActive
                  ? "bg-gradient-to-b from-indigo-900/95 to-purple-950/95 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.7)] scale-105 z-40 ring-2 ring-indigo-400 rounded-xl"
                  : isCompleted
                  ? "bg-emerald-950/40 border-emerald-500/40"
                  : "bg-slate-950/90 hover:bg-slate-900"
              }`}
            >
              {/* Badge da Letra */}
              <div className="w-full flex items-center justify-between px-1 mb-0.5">
                <span
                  className={`text-[11px] font-black tracking-wider ${
                    isActive
                      ? "text-emerald-300 animate-bounce"
                      : isCompleted
                      ? "text-emerald-400"
                      : "text-slate-200"
                  }`}
                >
                  {item.char}
                </span>
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : null}
              </div>

              {/* Thumbnail 1:1 em Fundo Branco */}
              <div className="w-full flex-1 aspect-square bg-white rounded-md shadow-md border border-slate-200 overflow-hidden relative max-w-[80px] max-h-[80px] mx-auto">
                <img
                  src={alfabetoImage}
                  alt={`Sinal ${item.char}`}
                  className="absolute max-w-none pointer-events-none"
                  style={imageStyle}
                />
              </div>

              {/* BALÃO EXPLICATIVO POSICIONADO DIREÇÃO CERTA DA MOLDURA */}
              <div
                className={`absolute hidden group-hover:block ${
                  isActive ? "!block" : ""
                } ${tooltipPositionClass} w-52 p-2.5 rounded-xl bg-slate-950 border border-indigo-500/50 text-[11px] text-slate-200 text-center shadow-2xl z-50 pointer-events-none backdrop-blur-md`}
              >
                <p className="font-bold text-indigo-300 mb-0.5">{item.name}</p>
                <p className="leading-tight text-slate-300">{item.tip}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

