import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type CameraState = {
  stream: MediaStream | null;
  hasPermission: boolean;
  isActivating: boolean;
  error: string | null;
  activeCameraId: string | null;
};

export type CameraContextType = {
  cameraState: CameraState;
  requestCamera: () => Promise<boolean>;
  stopCamera: () => void;
};

const initialCameraState: CameraState = {
  stream: null,
  hasPermission: false,
  isActivating: false,
  error: null,
  activeCameraId: null,
};

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cameraState, setCameraState] = useState<CameraState>(initialCameraState);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    setCameraState((prev) => ({
      ...prev,
      isActivating: true,
      error: null,
    }));

    try {
      if (cameraState.stream) {
        // Já possui stream ativo
        setCameraState((prev) => ({
          ...prev,
          hasPermission: true,
          isActivating: false,
        }));
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();

      setCameraState({
        stream,
        hasPermission: true,
        isActivating: false,
        error: null,
        activeCameraId: settings?.deviceId || "default",
      });

      console.log("[CameraContext] Câmera ativada com sucesso:", settings);
      return true;
    } catch (err: any) {
      const errorMessage =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Permissão da câmera foi negada no navegador."
          : err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
          ? "Nenhuma câmera encontrada neste dispositivo."
          : `Erro ao acessar a câmera: ${err.message || "Erro desconhecido"}`;

      console.error("[CameraContext] Erro de acesso à câmera:", err);

      setCameraState((prev) => ({
        ...prev,
        stream: null,
        hasPermission: false,
        isActivating: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [cameraState.stream]);

  const stopCamera = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach((track) => track.stop());
    }
    setCameraState(initialCameraState);
  }, [cameraState.stream]);

  return (
    <CameraContext.Provider value={{ cameraState, requestCamera, stopCamera }}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = (): CameraContextType => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCamera deve ser utilizado dentro de um CameraProvider");
  }
  return context;
};
