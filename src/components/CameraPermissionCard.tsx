import React, { useState } from "react";
import { useCamera } from "../context/CameraContext";
import { Camera, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";

type CardState = {
  userActionLogged: boolean;
  toastMessage: string | null;
};

export const CameraPermissionCard: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { cameraState, requestCamera } = useCamera();
  const [cardState, setCardState] = useState<CardState>({
    userActionLogged: false,
    toastMessage: null,
  });

  const handleActivateCamera = async () => {
    console.log("[CameraPermissionCard] Usuário clicou em 'Ligar Câmera'");
    setCardState((prev) => ({
      ...prev,
      userActionLogged: true,
      toastMessage: "Solicitando permissão da câmera...",
    }));

    const success = await requestCamera();

    if (success) {
      console.log("[CameraPermissionCard] Permissão concedida! Redirecionando para enquadramento...");
      setCardState((prev) => ({
        ...prev,
        toastMessage: "Câmera ativada com sucesso! Redirecionando...",
      }));
      setTimeout(() => {
        onSuccess();
      }, 600);
    } else {
      console.error("[CameraPermissionCard] Falha na ativação da câmera.");
      setCardState((prev) => ({
        ...prev,
        toastMessage: "Não foi possível ligar a câmera. Verifique as permissões.",
      }));
    }
  };

  return (
    <div className="w-full max-w-xl glass-panel rounded-3xl p-8 shadow-2xl border border-indigo-500/20 text-center relative overflow-hidden transition-all duration-300 hover:border-indigo-500/40">
      {/* Dynamic Background Glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-6 shadow-inner">
        <Camera className="w-10 h-10" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-2">
        <span>Ativação da Câmera</span>
        <Sparkles className="w-5 h-5 text-indigo-400" />
      </h2>

      <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto mb-8">
        Para iniciarmos a detecção e reconhecimento dos sinais em Libras, precisamos de acesso à sua webcam. 
        Nenhuma imagem é gravada ou enviada para servidores externos.
      </p>

      {/* Toast / Output Log Box */}
      {cardState.toastMessage && (
        <div
          id="camera-toast-output"
          className="mb-6 p-4 rounded-xl text-xs font-mono text-left bg-slate-900/90 border border-slate-700/80 text-slate-200 flex items-start gap-3 shadow-lg"
        >
          {cameraState.isActivating ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" />
          ) : cameraState.hasPermission ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 overflow-hidden">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">Log de Ativação</span>
            <span className="break-words">{cardState.toastMessage}</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        id="btn-ligar-camera"
        onClick={() => void handleActivateCamera()}
        disabled={cameraState.isActivating || cameraState.hasPermission}
        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
      >
        {cameraState.isActivating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Ligando Câmera...</span>
          </>
        ) : cameraState.hasPermission ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span>Câmera Ativada</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            <span>Ligar Câmera</span>
          </>
        )}
      </button>

      {cameraState.error && (
        <p className="mt-4 text-xs text-rose-400 font-medium">
          {cameraState.error}
        </p>
      )}
    </div>
  );
};
