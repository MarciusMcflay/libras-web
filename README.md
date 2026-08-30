# Libras Web — Reconhecimento do Alfabeto Manual em LIBRAS

Aplicação web interativa para reconhecimento em tempo real de sinais do **Alfabeto Manual da LIBRAS** (Língua Brasileira de Sinais) utilizando câmera, **MediaPipe Hands** (visão computacional 3D) e um classificador geométrico determinístico em TypeScript.

---

##  Sumário
- [Visão Geral](#-visão-geral)
- [Como Funcionam as "Bolinhas" (Landmarks do MediaPipe)](#-como-funcionam-as-bolinhas-landmarks-do-mediapipe)
- [Classificação com Estrutura de `if` e Geometria 3D](#-classificação-com-estrutura-de-if-e-geometria-3d)
- [O Desafio da Letra "S" vs. (A, T, E)](#-o-desafio-da-letra-s-vs-a-t-e)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Executar o Projeto](#-como-executar-o-projeto)

---

##  Visão Geral

O projeto captura os frames da webcam e os processa através do modelo **MediaPipe Task Vision**, que retorna as coordenadas tridimensionais $(x, y, z)$ dos 21 pontos anatômicos da mão. 

Em seguida, o módulo de classificação `src/utils/librasClassifier.ts` avalia as distâncias relativas, ângulos vetoriais e cruzamentos de coordenadas para determinar com alta precisão qual letra do alfabeto de LIBRAS está sendo executada.

---

##  Como Funcionam as "Bolinhas" (Landmarks do MediaPipe)

O MediaPipe Hands mapeia a mão em **21 pontos chave (conhecidos no projeto como "bolinhas" ou Landmarks)**, numerados de 0 a 20:

```
                  [8] Tip          [12] Tip        [16] Tip        [20] Tip
                   |                |               |               |
                  [7] DIP          [11] DIP        [15] DIP        [19] DIP
                   |                |               |               |
    [4] Tip       [6] PIP          [10] PIP        [14] PIP        [18] PIP
     |             |                |               |               |
    [3] IP        [5] MCP          [9] MCP         [13] MCP        [17] MCP
     |             \________________|_______________/______________/
    [2] MCP                         |
     |                              |
    [1] CMC                         |
     \____________________________[0] Wrist (Pulso)
```

### Mapeamento dos Pontos:
- **`0` (Wrist)**: Pulso (ponto base de referência).
- **`1` - `4` (Polegar / Thumb)**:
  - `1`: CMC | `2`: MCP | `3`: IP | **`4`: Tip (Ponta do Polegar)**
- **`5` - `8` (Indicador / Index)**:
  - `5`: MCP | `6`: PIP | `7`: DIP | **`8`: Tip (Ponta do Indicador)**
- **`9` - `12` (Médio / Middle)**:
  - `9`: MCP | `10`: PIP | `11`: DIP | **`12`: Tip (Ponta do Médio)**
- **`13` - `16` (Anelar / Ring)**:
  - `13`: MCP | `14`: PIP | `15`: DIP | **`16`: Tip (Ponta do Anelar)**
- **`17` - `20` (Mínimo / Pinky)**:
  - `17`: MCP | `18`: PIP | `19`: DIP | **`20`: Tip (Ponta do Mínimo)**

Cada ponto possui 3 valores:
- `x`: Posição horizontal na tela (0.0 a 1.0).
- `y`: Posição vertical na tela (0.0 a 1.0).
- `z`: Profundidade em relação ao plano da câmera (valores negativos indicam proximidade da câmera).

---

##  Classificação com Estrutura de `if` e Geometria 3D

Em vez de usar redes neurais genéricas "caixa-preta" que podem falhar na diferenciação de sinais sutis, o arquivo [librasClassifier.ts](file:///media/marcius/Geral1/Shinier/libras/libras-web/src/utils/librasClassifier.ts) implementa uma **máquina de estados heurística determinística com encadeamento de `if / else if`**.

### Principais Heurísticas Calculadas:

1. **Normalização por Escala da Palma (`palmSize`)**:
   - Calcula a distância euclidiana 3D entre o Pulso (ponto `0`) e a base do Médio (ponto `9`).
   - Todas as métricas de distância entre dedos são divididas por esse `palmSize`, garantindo que a detecção funcione perfeitamente independentemente da distância da mão em relação à câmera.

2. **Orientação no Espaço 3D (`UP`, `DOWN`, `SIDEWAYS`)**:
   - Compara os deltas horizontais e verticais entre o pulso (`0`) e as bases dos dedos (`MCP`), identificando se a mão está virada para cima, para baixo ou de lado.

3. **Verificação de Extensão vs. Dobramento de Dedos**:
   - Avalia a razão de distância entre o pulso e as pontas em comparação às articulações intermediárias (`isIndexExt`, `isMiddleFoldedInFist`, etc.).

4. **Abertura de Ângulos Vetoriais (`getWristApertureAngle`)**:
   - Usa o produto escalar (dot product) para calcular o ângulo em graus entre a ponta do indicador, o pulso e o polegar.

---

##  O Desafio da Letra "S" vs. (A, T, E)

No Alfabeto Manual de LIBRAS, as letras **A**, **S**, **T** e **E** compartilham a mesma configuração básica de mão: **os quatro dedos (indicador, médio, anelar e mínimo) ficam recolhidos formando um punho cerrado**.

A diferenciação entre elas depende **exclusivamente da posição da bolinha `4` (ponta do polegar)** em relação às demais bolinhas das articulações da mão.

### Comparativo da Posição das "Bolinhas":

| Letra | Posição da "Bolinha" 4 (Ponta do Polegar) | Regra em Código (`if`) |
| :--- | :--- | :--- |
| **A** | Apoia na **lateral externa** do dedo indicador (bolinha `6`). | `!isThumbInPalmArea && isThumbExtendedUp && !isThumbCrossingOverToRingFinger` |
| **T** | Enfiada **entre** o indicador (bolinha `6`) e o médio (bolinha `10`) em sinal de figas. | `(thumbTip.x - indexPip.x) * (thumbTip.x - middlePip.x) < -0.0001` |
| **E** | Recolhida **para dentro** da área da palma da mão, abaixo da base das falanges. | `isThumbInPalmArea \|\| distance(thumbTip, middleMcp) < palmSize * 0.40` |
| **S** | **Cruza por cima** das falanges do indicador e médio, repousando a ponta sobre o dedo anelar (bolinhas `13`/`14`). | `isThumbCrossingOverToRingFinger` |

### Detalhamento da Regra do "S" no Código:

Para detectar a letra **S**, foi desenvolvida uma checagem anatômica estrita:

```typescript
// REGRA ANATÔMICA DEFINITIVA DO S:
// O polegar cruza cortando as falanges do indicador e médio,
// e a ponta repousa SOBRE a região do DEDO ANELAR (pontas 14 e 13),
// com profundidade Z menor (à frente do indicador no espaço 3D).
const isThumbCrossingOverToRingFinger =
  (distance(thumbTip, ringPip) / palmSize < 0.38 || distance(thumbTip, ringMcp) / palmSize < 0.38) &&
  distance(thumbTip, indexPip) / palmSize < 0.35 &&
  thumbTip.z < indexPip.z;
```

Na estrutura de decisão do punho fechado:

```typescript
else if (
  (extendedCount === 0 || (isIndexFoldedInFist && isMiddleFoldedInFist && isRingFoldedInFist)) &&
  isPinkyFoldedInFist
) {
  // 1. Verifica T (Figas - Polegar entre indicador e médio)
  if (isThumbTipBetweenJoints6and10) { ... }

  // 2. Verifica A (Polegar na lateral externa)
  else if (!isThumbInPalmArea && isThumbExtendedUp && !isThumbCrossingOverToRingFinger) { ... }

  // 3. Verifica S (Polegar cruzado por cima até o anelar)
  else if (isThumbCrossingOverToRingFinger) {
    letter = "S";
    confidence = 0.96;
    description = "Letra S: Punho totalmente fechado com o polegar cruzando indicador e médio até o dedo anelar";
  }

  // 4. Verifica E (Polegar recolhido para dentro da palma)
  else if (isThumbInPalmArea || ...) { ... }
}
```

---

##  Estrutura do Projeto

```
libras-web/
├── src/
│   ├── components/       # Componentes reutilizáveis (CameraPermissionCard, etc.)
│   ├── hooks/            # Hooks customizados (useHandLandmarker.ts)
│   ├── pages/            # Páginas principais (Home, Alphabet, Framing)
│   ├── utils/            # Lógica de classificação (librasClassifier.ts)
│   ├── App.tsx           # Configuração de rotas da aplicação
│   └── main.tsx          # Ponto de entrada React
├── .env                  # Variáveis de ambiente
├── .env.example          # Modelo de variáveis de ambiente
├── .gitignore            # Arquivos ignorados pelo Git
├── index.html            # Estrutura HTML da aplicação
├── package.json          # Dependências do projeto
├── tailwind.config.js    # Configuração de estilos do Tailwind CSS
└── vite.config.ts        # Configuração do bundler Vite
```

---

##  Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 18 ou superior)
- NPM ou Yarn

### Passo a passo

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Acessar no navegador**:
   Navegue para `http://localhost:5173` (ou a porta informada no terminal) e conceda permissão de uso da webcam.
