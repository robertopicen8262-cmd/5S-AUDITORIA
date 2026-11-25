import React, { useState } from 'react';
import { ClipboardCheck, Lock, ShieldCheck } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

export const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
      setError(`Error de autenticación: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sistema Inteligente de Auditoría 5S
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Plataforma industrial de Lean Manufacturing y control de calidad para evaluaciones 5S,
            digitalización de formatos con IA y trazabilidad en Firebase.
          </p>
        </div>

        <div className="border-t border-b border-slate-200 py-4 space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
            <span>Almacenamiento persistente en Firebase Firestore y Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-700 shrink-0" />
            <span>Acceso verificado mediante cuenta corporativa o Google</span>
          </div>
        </div>

        {error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="w-full min-h-[46px] px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? 'Conectando...' : 'Iniciar sesión con Google'}
        </button>
      </div>
    </div>
  );
};
