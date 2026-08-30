export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type HandDetectionResult = {
  letter: string;
  confidence: number;
  description: string;
  isFramed: boolean;
  landmarksCount: number;
  orientation: "UP" | "DOWN" | "SIDEWAYS";
};

// Calcula a distância euclidiana 3D entre dois pontos
function distance(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Calcula o ângulo em graus entre dois vetores a partir de um ponto central (vértice)
function getAngleDegrees(vertex: Landmark, p1: Landmark, p2: Landmark): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

// Calcula o ângulo de abertura real em graus entre a ponta do indicador e a ponta do polegar em relação ao pulso (wrist)
function getWristApertureAngle(
  wrist: Landmark,
  indexTip: Landmark,
  thumbTip: Landmark
): number {
  const vIndex = { x: indexTip.x - wrist.x, y: indexTip.y - wrist.y };
  const vThumb = { x: thumbTip.x - wrist.x, y: thumbTip.y - wrist.y };

  const dot = vIndex.x * vThumb.x + vIndex.y * vThumb.y;
  const magIndex = Math.sqrt(vIndex.x * vIndex.x + vIndex.y * vIndex.y);
  const magThumb = Math.sqrt(vThumb.x * vThumb.x + vThumb.y * vThumb.y);

  if (magIndex === 0 || magThumb === 0) return 0;

  const cosTheta = Math.max(-1, Math.min(1, dot / (magIndex * magThumb)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

// Verifica se a ponta do polegar (landmarks[4]) está geometricamente DENTRO da área do polígono da palma da mão
// delimitada pelos 4 pontos essenciais da palma: Pulso (0), IndexMCP (5), MiddleMCP (9) e PinkyMCP (17)
function isThumbInsidePalmRegion(
  thumbTip: Landmark,
  wrist: Landmark,
  indexMcp: Landmark,
  middleMcp: Landmark,
  pinkyMcp: Landmark
): boolean {
  const topPalmY = Math.min(indexMcp.y, middleMcp.y, pinkyMcp.y);
  const bottomPalmY = wrist.y;

  const minPalmX = Math.min(wrist.x, indexMcp.x, pinkyMcp.x) - 0.03;
  const maxPalmX = Math.max(wrist.x, indexMcp.x, pinkyMcp.x) + 0.03;

  // A ponta do polegar fica recolhida abaixo do topo da palma (topPalmY) e acima do pulso
  const isInsideY = thumbTip.y >= topPalmY - 0.02 && thumbTip.y <= bottomPalmY + 0.05;
  const isInsideX = thumbTip.x >= minPalmX && thumbTip.x <= maxPalmX;

  return isInsideY && isInsideX;
}

// Verifica se os 21 pontos essenciais do pulso e da mão estão visíveis
export function checkHandFraming(landmarks: Landmark[] | undefined): {
  isFramed: boolean;
  message: string;
  progress: number;
} {
  if (!landmarks || landmarks.length < 21) {
    return {
      isFramed: false,
      message: "Posicione sua mão em frente à câmera",
      progress: 0,
    };
  }

  const wrist = landmarks[0];
  const indexTip = landmarks[8];
  const pinkyTip = landmarks[20];

  const isCentered =
    wrist.x > 0.05 &&
    wrist.x < 0.95 &&
    wrist.y > 0.05 &&
    wrist.y < 0.95 &&
    indexTip.x > 0.05 &&
    indexTip.x < 0.95 &&
    pinkyTip.x > 0.05 &&
    pinkyTip.x < 0.95;

  if (!isCentered) {
    return {
      isFramed: false,
      message: "Mantenha a mão centralizada no campo de visão",
      progress: 50,
    };
  }

  const palmScale = distance(wrist, landmarks[9]);
  if (palmScale < 0.08) {
    return {
      isFramed: false,
      message: "Aproxime a mão da câmera",
      progress: 75,
    };
  }

  return {
    isFramed: true,
    message: "Mão e pulso enquadrados perfeitamente!",
    progress: 100,
  };
}

export function classifyLibrasSign(landmarks: Landmark[]): HandDetectionResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      letter: "-",
      confidence: 0,
      description: "Nenhuma mão detectada",
      isFramed: false,
      landmarksCount: 0,
      orientation: "UP",
    };
  }

  // --- LANDMARKS DA MÃO ---
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];

  const indexTip = landmarks[8];
  const indexDip = landmarks[7];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];

  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];

  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];

  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];

  // Escala de referência da palma da mão
  const palmSize = distance(wrist, middleMcp);
  if (palmSize === 0) {
    return {
      letter: "-",
      confidence: 0,
      description: "Erro de escala da mão",
      isFramed: false,
      landmarksCount: landmarks.length,
      orientation: "UP",
    };
  }

  // --- DETECÇÃO DE ORIENTAÇÃO 3D (CIMA / BAIXO / LADO) ---
  const deltaX = Math.abs(middleMcp.x - wrist.x);
  const deltaY = middleMcp.y - wrist.y;

  let orientation: "UP" | "DOWN" | "SIDEWAYS" = "SIDEWAYS";
  if (deltaY < -0.06 && deltaY < -deltaX) {
    orientation = "UP";
  } else if (deltaY > 0.06 && deltaY > deltaX) {
    orientation = "DOWN";
  } else {
    orientation = "SIDEWAYS";
  }

  // Ângulo de abertura do polegar e indicador em relação ao pulso (Wrist)
  const wristApertureAngle = getWristApertureAngle(wrist, indexTip, thumbTip);

  // Verificação de dedos apontados para baixo (indicador e médio abaixo da base MCP)
  const isFingersPointingDown = indexTip.y > indexMcp.y && middleTip.y > middleMcp.y;

  // Direção dominante do indicador (Vertical para CIMA vs Horizontal para o LADO)
  const isIndexPointingVerticalUp =
    indexTip.y < indexMcp.y &&
    Math.abs(indexTip.y - indexMcp.y) > Math.abs(indexTip.x - indexMcp.x) * 0.85;

  const isIndexPointingHorizontalSideways =
    Math.abs(indexTip.x - indexMcp.x) > Math.abs(indexTip.y - indexMcp.y) * 0.85;

  // Extensão do dedo mínimo (para a Letra I, J, Y)
  const isPinkyExt =
    distance(wrist, pinkyTip) > distance(wrist, pinkyPip) * 1.12 ||
    distance(pinkyMcp, pinkyTip) > distance(pinkyMcp, pinkyPip) * 1.30;

  // Estados individuais de extensão dos outros 3 dedos
  const isIndexExt = (distance(wrist, indexTip) > distance(wrist, indexPip) * 1.15) || isIndexPointingHorizontalSideways;
  const isMiddleExt = (distance(wrist, middleTip) > distance(wrist, middlePip) * 1.15) || Math.abs(middleTip.x - middleMcp.x) > palmSize * 0.30;
  const isRingExt = distance(wrist, ringTip) > distance(wrist, ringPip) * 1.15;

  // Verificação estrita de dedos dobrados no punho (para K vs E, H vs E, C, Y, A, S, T, R, V, U, L, D)
  const isIndexFoldedInFist = distance(wrist, indexTip) < distance(wrist, indexMcp) * 1.25;
  const isMiddleFoldedInFist = distance(wrist, middleTip) < distance(wrist, middleMcp) * 1.25;
  const isRingFoldedInFist = distance(wrist, ringTip) < distance(wrist, ringMcp) * 1.25;
  const isPinkyFoldedInFist = distance(wrist, pinkyTip) < distance(wrist, pinkyMcp) * 1.25;

  const extendedCount = [isIndexExt, isMiddleExt, isRingExt, isPinkyExt].filter(Boolean).length;

  // Distâncias relativas entre dedos
  const indexMiddleDist = distance(indexTip, middleTip) / palmSize;
  const thumbIndexDist = distance(thumbTip, indexTip) / palmSize;
  const thumbMiddleDist = distance(thumbTip, middleTip) / palmSize;
  const thumbPinkyDist = distance(thumbTip, pinkyTip) / palmSize;
  const thumbToMiddleTipDist = distance(thumbTip, middleTip) / palmSize;
  const thumbToRingTipDist = distance(thumbTip, ringTip) / palmSize;

  const indexWristDist = distance(indexTip, wrist) / palmSize;
  const middleWristDist = distance(middleTip, wrist) / palmSize;
  const ringWristDist = distance(ringTip, wrist) / palmSize;
  const pinkyWristDist = distance(pinkyTip, wrist) / palmSize;
  const avgWristDist = (indexWristDist + middleWristDist + ringWristDist + pinkyWristDist) / 4;

  // Verificação de anel formado para o D
  const isRingFormedWithThumb = thumbToMiddleTipDist < 0.38 || (thumbToMiddleTipDist < 0.42 && thumbToRingTipDist < 0.42);

  // REGRA VISUAL EXATA DA LETRA X: Ponto 7 (DIP) e ponto 8 (ponta do indicador) ficam bem próximos em gancho elevado
  const isIndexHooked =
    distance(indexTip, indexDip) < palmSize * 0.22 ||
    distance(indexTip, indexPip) < palmSize * 0.32 ||
    (indexPip.y < middlePip.y - palmSize * 0.03 && indexTip.y > indexPip.y - palmSize * 0.03);

  // REGRA ANATÔMICA DEFINITIVA DO S: O polegar cruza cortando as falanges do indicador/médio e a ponta repousa SOBRE a região do DEDO ANELAR
  const isThumbCrossingOverToRingFinger =
    (distance(thumbTip, ringPip) / palmSize < 0.38 || distance(thumbTip, ringMcp) / palmSize < 0.38) &&
    distance(thumbTip, indexPip) / palmSize < 0.35 &&
    thumbTip.z < indexPip.z;

  // VERIFICAÇÃO GEOMÉTRICA DE PALMA DA MÃO (Usando os 4 pontos 0, 5, 9, 17)
  const isThumbInPalmArea = isThumbInsidePalmRegion(thumbTip, wrist, indexMcp, middleMcp, pinkyMcp);

  let letter = "?";
  let confidence = 0.85;
  let description = "Gesto em análise";

  // =========================================================================
  // REGRAS ESPECÍFICAS INDIVIDUAIS PARA CADA LETRA DO ALFABETO MANUAL LIBRAS
  // =========================================================================

  // 1. LETRA B: Todos os 4 dedos estendidos para CIMA e polegar recolhido sobre a palma
  if (
    isIndexExt &&
    isMiddleExt &&
    isRingExt &&
    isPinkyExt &&
    (orientation === "UP" || indexTip.y < indexMcp.y)
  ) {
    letter = "B";
    confidence = 0.98;
    description = "Letra B: Quatro dedos estendidos para CIMA e polegar recolhido sobre a palma";
  }

  // 2. LETRA D: APENAS o indicador estendido para CIMA na vertical (NÃO dobrado em punho!), e pontas do médio/anelar unidas ao polegar
  else if (
    distance(wrist, indexTip) > distance(wrist, indexMcp) * 1.30 &&
    !isIndexFoldedInFist &&
    !isMiddleExt &&
    !isRingExt &&
    !isPinkyExt &&
    (orientation === "UP" || indexTip.y < indexMcp.y) &&
    isRingFormedWithThumb
  ) {
    letter = "D";
    confidence = 0.98;
    description = "Letra D: Apenas o indicador estendido para CIMA na vertical e pontas dos demais dedos unidas ao polegar em anel";
  }

  // 3. LETRA G: Mão de LADO / VIRADA PARA A DIREITA com INDICADOR ESTENDIDO na HORIZONTAL (deltaX dominante) e polegar paralelo
  else if (
    isIndexExt &&
    !isMiddleExt &&
    !isRingExt &&
    !isPinkyExt &&
    !isRingFormedWithThumb &&
    (isIndexPointingHorizontalSideways || orientation === "SIDEWAYS") &&
    !isIndexPointingVerticalUp &&
    !isFingersPointingDown &&
    wristApertureAngle < 52
  ) {
    letter = "G";
    confidence = 0.98;
    description = "Letra G: Mão de lado com indicador apontando para o LADO na horizontal";
  }

  // 4. LETRA L: Indicador estendido e esticado para CIMA na VERTICAL (NÃO dobrado no punho!), polegar aberto em L
  else if (
    !isIndexFoldedInFist &&
    distance(wrist, indexTip) > distance(wrist, indexMcp) * 1.30 &&
    isIndexPointingVerticalUp &&
    isMiddleFoldedInFist &&
    isRingFoldedInFist &&
    isPinkyFoldedInFist &&
    !isRingFormedWithThumb &&
    (wristApertureAngle >= 25 || thumbIndexDist > 0.28 || distance(thumbTip, indexMcp) > palmSize * 0.28)
  ) {
    letter = "L";
    confidence = 0.98;
    description = "Letra L: Indicador estendido para CIMA na vertical e polegar aberto em L (demais dedos fechados no punho)";
  }

  // 5. LETRA R: Indicador e médio OBRIGATORIAMENTE ESTENDIDOS PARA CIMA E CRUZADOS (ordem X das pontas invertida em relação às MCPs)
  else if (
    indexTip.y < indexMcp.y - palmSize * 0.08 &&
    middleTip.y < middleMcp.y - palmSize * 0.08 &&
    !isIndexFoldedInFist &&
    !isMiddleFoldedInFist &&
    !isRingExt &&
    !isPinkyExt &&
    (indexTip.x - middleTip.x) * (indexMcp.x - middleMcp.x) < 0
  ) {
    letter = "R";
    confidence = 0.98;
    description = "Letra R: Indicador e médio estendidos para CIMA e OBRIGATORIAMENTE CRUZADOS";
  }

  // 6. BLOCO MÃO DE FRENTE (DEDOS PARA CIMA) -> LÓGICA DO U OU V
  else if (
    indexTip.y < indexMcp.y &&
    middleTip.y < middleMcp.y &&
    isIndexExt &&
    isMiddleExt &&
    !isIndexFoldedInFist &&
    !isMiddleFoldedInFist &&
    (!isRingExt || isRingFoldedInFist) &&
    (!isPinkyExt || isPinkyFoldedInFist) &&
    !isIndexPointingHorizontalSideways &&
    !isFingersPointingDown
  ) {
    // Se a ponta dos dedos estiver AFASTADA -> É V!
    if (indexMiddleDist > 0.28) {
      letter = "V";
      confidence = 0.98;
      description = "Letra V: Mão de frente com indicador e médio estendidos AFASTADOS em V";
    }
    // Se a ponta dos dedos estiver PRÓXIMA / PARALELA -> É U!
    else {
      letter = "U";
      confidence = 0.98;
      description = "Letra U: Mão de frente com indicador e médio estendidos PRÓXIMOS / PARALELOS";
    }
  }

  // 7. BLOCO MÃO DE LADO OU DE COSTAS (PALMA VIRADA DE LADO OU DE COSTAS) -> LÓGICA DO K OU H
  else if (
    isIndexExt &&
    isMiddleExt &&
    !isIndexFoldedInFist &&
    !isMiddleFoldedInFist &&
    !isRingExt &&
    !isPinkyExt &&
    !isRingFormedWithThumb &&
    !isFingersPointingDown &&
    (
      orientation === "SIDEWAYS" ||
      Math.abs(indexMcp.x - wrist.x) > 0.03 ||
      Math.abs(middleMcp.x - wrist.x) > 0.03 ||
      isIndexPointingHorizontalSideways
    )
  ) {
    // Se as pontas do indicador e do médio estiverem AFASTADAS -> É K!
    if (indexMiddleDist > 0.26 || Math.abs(middleTip.x - indexTip.x) > 0.04 || middleTip.y > indexTip.y + 0.02) {
      letter = "K";
      confidence = 0.98;
      description = "Letra K: Mão de lado ou de costas com pontas do indicador e médio AFASTADAS";
    }
    // Se as pontas do indicador e do médio estiverem PRÓXIMAS / COLADAS -> É H!
    else {
      letter = "H";
      confidence = 0.98;
      description = "Letra H: Mão de lado ou de costas com pontas do indicador e médio PRÓXIMOS / COLADAS";
    }
  }

  // 8. LETRA M: 3 DEDOS (indicador, médio e anelar) OBRIGATORIAMENTE ESTENDIDOS E APONTADOS PARA BAIXO
  else if (
    isIndexExt &&
    isMiddleExt &&
    isRingExt &&
    !isRingFoldedInFist &&
    !isPinkyExt &&
    indexTip.y > indexPip.y &&
    middleTip.y > middlePip.y &&
    ringTip.y > ringPip.y
  ) {
    letter = "M";
    confidence = 0.98;
    description = "Letra M: Indicador, médio e anelar estendidos apontados para BAIXO";
  }

  // 9. LETRA N: 2 DEDOS (indicador e médio) ESTENDIDOS PARA BAIXO, com o anelar OBRIGATORIAMENTE FECHADO NO PUNHO
  else if (
    isIndexExt &&
    isMiddleExt &&
    (isRingFoldedInFist || !isRingExt) &&
    !isPinkyExt &&
    indexTip.y > indexMcp.y &&
    middleTip.y > middleMcp.y
  ) {
    letter = "N";
    confidence = 0.98;
    description = "Letra N: Indicador e médio estendidos para BAIXO (anelar fechado no punho)";
  }

  // 10. LETRA P: Ponta do indicador ACIMA da linha do pulso, ponta do dedo médio ABAIXO da linha do pulso (demais dedos fechados)
  else if (
    indexTip.y < wrist.y &&
    middleTip.y >= wrist.y - palmSize * 0.10 &&
    !isRingExt &&
    !isPinkyExt &&
    (isRingFoldedInFist || ringWristDist < 0.75) &&
    (isPinkyFoldedInFist || pinkyWristDist < 0.75)
  ) {
    letter = "P";
    confidence = 0.98;
    description = "Letra P: Ponta do indicador acima da linha do pulso e ponta do médio abaixo da linha do pulso";
  }

  // 11. LETRA W: 3 dedos estendidos para CIMA (indicador, médio, anelar)
  else if (
    isIndexExt &&
    isMiddleExt &&
    isRingExt &&
    !isPinkyExt &&
    (orientation === "UP" || indexTip.y < indexMcp.y)
  ) {
    letter = "W";
    confidence = 0.97;
    description = "Letra W: Indicador, médio e anelar estendidos para CIMA";
  }

  // 12. LETRA I: APENAS o dedo mínimo estendido para CIMA (ponta do mínimo ACIMA da linha do pulso), polegar recolhido
  else if (
    !isPinkyFoldedInFist &&
    distance(wrist, pinkyTip) > distance(wrist, pinkyMcp) * 1.25 &&
    !isIndexExt &&
    !isMiddleExt &&
    !isRingExt &&
    pinkyTip.y < wrist.y &&
    (isThumbInPalmArea || distance(thumbTip, indexMcp) < palmSize * 0.40)
  ) {
    letter = "I";
    confidence = 0.98;
    description = "Letra I: Dedo mínimo estendido para CIMA com o polegar recolhido sobre a palma da mão";
  }

  // 13. LETRA J: APENAS o dedo mínimo estendido (projetado para baixo / mais baixo que a base MCP ou pulso)
  else if (
    !isPinkyFoldedInFist &&
    distance(wrist, pinkyTip) > distance(wrist, pinkyMcp) * 1.20 &&
    !isIndexExt &&
    !isMiddleExt &&
    !isRingExt &&
    (pinkyTip.y > pinkyMcp.y - palmSize * 0.10 || pinkyTip.y >= wrist.y - palmSize * 0.15)
  ) {
    letter = "J";
    confidence = 0.98;
    description = "Letra J: Apenas o dedo mínimo estendido com a ponta projetada para baixo no movimento";
  }

  // 14. LETRA F: Mínimo, anelar e médio na vertical para CIMA; indicador e polegar tocam a ponta
  else if (
    isMiddleExt &&
    isRingExt &&
    isPinkyExt &&
    thumbIndexDist < 0.35
  ) {
    letter = "F";
    confidence = 0.96;
    description = "Letra F: Médio, anelar e mínimo para CIMA com indicador e polegar tocando as pontas";
  }

  // 15. LETRA Q: Apenas o indicador e polegar estendidos apontando para BAIXO
  else if (
    isIndexExt &&
    !isMiddleExt &&
    !isRingExt &&
    !isPinkyExt &&
    (orientation === "DOWN" || isFingersPointingDown)
  ) {
    letter = "Q";
    confidence = 0.96;
    description = "Letra Q: Apenas o indicador e polegar apontados para BAIXO";
  }

  // 16. LETRA X: Indicador em formato de GANCHO (pontos 7 e 8 bem próximos), e demais dedos dobrados no punho (PRIORIDADE ANTES DO BLOCO DE PUNHO)
  else if (
    isIndexHooked &&
    isMiddleFoldedInFist &&
    isRingFoldedInFist &&
    isPinkyFoldedInFist &&
    !isIndexExt
  ) {
    letter = "X";
    confidence = 0.98;
    description = "Letra X: Dedo indicador em formato de gancho (pontos 7 e 8 bem próximos) com os demais dedos dobrados";
  }

  // 17. BLOCO DE PUNHO / 4 DEDOS FECHADOS (A, T, S, E) - MÍNIMO DOBRADO NO PUNHO (isPinkyFoldedInFist)
  else if (
    (extendedCount === 0 || (isIndexFoldedInFist && isMiddleFoldedInFist && isRingFoldedInFist)) &&
    isPinkyFoldedInFist
  ) {
    const isThumbExtendedUp = thumbTip.y < thumbIp.y || thumbTip.y < indexPip.y + palmSize * 0.05;

    // VERIFICAÇÃO VISUAL PERFEITA DE FIGAS (T vs A):
    // Na Figas (Letra T): O ponto 4 (ponta do polegar) fica fisicamente ENTRE o ponto 6 (PIP do indicador) e o ponto 10 (PIP do médio).
    // O produto da diferença X em relação ao ponto 6 e ao ponto 10 é ESTRITAMENTE NEGATIVO (< -0.0001).
    // Na Letra A: O ponto 4 fica do LADO DE FORA do ponto 6 (mesmo estando colado/pertinho do 6), tornando o produto POSITIVO (> 0).
    const isThumbTipBetweenJoints6and10 =
      (thumbTip.x - indexPip.x) * (thumbTip.x - middlePip.x) < -0.0001;

    // LETRA T: Sinal de figas (ponta 4 enfiada estritamente no meio do ponto 6 e 10)
    if (isThumbTipBetweenJoints6and10) {
      letter = "T";
      confidence = 0.98;
      description = "Letra T: Sinal de figas com o ponto 4 (polegar) no meio do ponto 6 (indicador) e 10 (médio)";
    }
    // LETRA A: Quatro dedos dobrados e o ponto 4 colado/pertinho na lateral externa do ponto 6
    else if (!isThumbInPalmArea && isThumbExtendedUp && !isThumbCrossingOverToRingFinger) {
      letter = "A";
      confidence = 0.98;
      description = "Letra A: Dedos dobrados com o ponto 4 na lateral externa do ponto 6";
    }
    // LETRA S: Punho totalmente fechado com a ponta do polegar cruzada TRANSVERSALMENTE POR CIMA das falanges até o anelar
    else if (isThumbCrossingOverToRingFinger) {
      letter = "S";
      confidence = 0.96;
      description = "Letra S: Punho totalmente fechado com o polegar cruzando indicador e médio até o dedo anelar";
    }
    // LETRA E: Todas as falanges dobradas e a PONTA DO POLEGAR FICA RECOLHIDA DENTRO DA ÁREA DA PALMA DA MÃO
    else if (isThumbInPalmArea || distance(thumbTip, middleMcp) < palmSize * 0.40) {
      letter = "E";
      confidence = 0.98;
      description = "Letra E: Falanges dos 4 dedos dobradas e a ponta do polegar fica recolhida DENTRO da área da palma da mão";
    }
    // Fallback E para dedos totalmente recolhidos
    else {
      letter = "E";
      confidence = 0.95;
      description = "Letra E: Falanges dos 4 dedos dobradas com o polegar recolhido sobre a palma";
    }
  }

  // 18. LETRA C: Todos os 4 dedos em arco paralelos ao polegar na horizontal (NENHUM DEDO DOBRADO EM PUNHO E NÃO APONTANDO PARA BAIXO)
  else if (
    !isFingersPointingDown &&
    !(indexTip.y > indexMcp.y && middleTip.y > middleMcp.y) &&
    !isIndexFoldedInFist &&
    !isMiddleFoldedInFist &&
    !isRingFoldedInFist &&
    !isPinkyFoldedInFist &&
    thumbIndexDist >= 0.25 &&
    thumbIndexDist <= 1.35 &&
    middleWristDist > 0.65 &&
    ringWristDist > 0.60 &&
    pinkyWristDist > 0.55
  ) {
    letter = "C";
    confidence = 0.96;
    description = "Letra C: Quatro dedos em arco paralelos ao polegar em formato de C";
  }

  // 19. LETRA Y (Hang Loose): Dedo mínimo estendido e POLEGAR ESTICADO BEM LONGE DA MÃO (fora da área da palma da mão)
  else if (
    isPinkyExt &&
    isIndexFoldedInFist &&
    isMiddleFoldedInFist &&
    isRingFoldedInFist &&
    !isThumbInPalmArea &&
    thumbPinkyDist > 0.75
  ) {
    letter = "Y";
    confidence = 0.96;
    description = "Letra Y: Dedo mínimo estendido e polegar esticado BEM LONGE da mão (fora da área da palma)";
  }

  // 20. LETRA O: Todos os dedos encostam a ponta com o polegar formando círculo oco (ponta do polegar afastada da palma)
  else if (
    thumbIndexDist < 0.38 &&
    thumbMiddleDist < 0.45 &&
    avgWristDist > 0.90 &&
    distance(thumbTip, wrist) > palmSize * 0.70
  ) {
    letter = "O";
    confidence = 0.95;
    description = "Letra O: Pontas de todos os dedos encostadas no polegar formando um anel oco no ar";
  }

  // 21. LETRA Z: Dedo indicador estendido desenhando movimento Z no ar
  else if (
    isIndexExt &&
    !isMiddleExt &&
    !isRingExt &&
    !isPinkyExt &&
    (indexTip.z > 0.05 || Math.abs(indexTip.x - indexMcp.x) > palmSize * 0.25)
  ) {
    letter = "Z";
    confidence = 0.95;
    description = "Letra Z: Dedo indicador estendido desenhando a letra Z no ar";
  }

  return {
    letter,
    confidence,
    description,
    isFramed: true,
    landmarksCount: landmarks.length,
    orientation,
  };
}
