import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  SlidersHorizontal,
  X,
  AlertCircle,
} from 'lucide-react';
import type { NavSection } from '../types/audit';
import { signOutUser } from '../firebase';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  text: string;
}

interface LayoutProps {
  user: User;
  activeNav: NavSection;
  onNavigate: (section: NavSection) => void;
  onStartNewAudit: () => void;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'disenador', label: 'Diseñador con IA', icon: Cpu },
  { id: 'auditorias', label: 'Auditorías 5S', icon: ClipboardCheck },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'administracion', label: 'Administración', icon: SlidersHorizontal },
];

const NAV_TITLES: Record<NavSection, string> = {
  inicio: 'Panel de Control 5S',
  disenador: 'Diseñador Inteligente con IA',
  auditorias: 'Formulario de Auditoría 5S',
  historial: 'Historial de Auditorías',
  administracion: 'Administración del Sistema',
};

export const Layout: React.FC<LayoutProps> = ({
  user,
  activeNav,
  onNavigate,
  onStartNewAudit,
  toasts,
  onDismissToast,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (section: NavSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Backdrop móvil */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      {/* Menú lateral industrial */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-sky-600 text-white flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-white truncate">
              Auditoría 5S
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3 shrink-0">
          <div className="text-xs">
            <p className="font-medium text-white truncate">
              {user.displayName || 'Inspector 5S'}
            </p>
            <p className="text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Panel principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              aria-label="Abrir navegación"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate">
                Sistema Inteligente de Auditoría 5S
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {NAV_TITLES[activeNav]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartNewAudit}
              className="min-h-[40px] px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Auditoría 5S</span>
            </button>
          </div>
        </header>

        {/* Mensajes de éxito y error */}
        {toasts.length > 0 ? (
          <div className="px-4 sm:px-6 pt-4 space-y-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="alert"
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {toast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                  )}
                  <span className="font-medium">{toast.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onDismissToast(toast.id)}
                  className="p-1 rounded hover:bg-black/5 shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
