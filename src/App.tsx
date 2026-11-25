/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout, type ToastMessage } from './components/Layout';
import { auth } from './firebase';
import { AdminPage } from './pages/AdminPage';
import { AiDesignerPage } from './pages/AiDesignerPage';
import { AuditFormPage } from './pages/AuditFormPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import {
  ensureUserProfile,
  subscribeAreas,
  subscribeAudits,
  subscribeCriteria,
  subscribeStations,
  subscribeTemplates,
} from './services/firestoreService';
import type {
  AuditRecord,
  AuditTemplate,
  EvaluationCriterion,
  NavSection,
  WorkArea,
  WorkStation,
} from './types/audit';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeNav, setActiveNav] = useState<NavSection>('inicio');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [areas, setAreas] = useState<WorkArea[]>([]);
  const [stations, setStations] = useState<WorkStation[]>([]);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedAuditForHistory, setSelectedAuditForHistory] =
    useState<AuditRecord | null>(null);
  const [selectedTemplateForAudit, setSelectedTemplateForAudit] =
    useState<AuditTemplate | null>(null);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          await ensureUserProfile(currentUser);
        } catch (err) {
          console.error('Error sincronizando perfil de usuario:', err);
        }
      } else {
        setAreas([]);
        setStations([]);
        setCriteria([]);
        setTemplates([]);
        setAudits([]);
        setDataLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);

    const onSubError = (err: Error) => {
      notify('error', `Error de sincronización Firestore: ${err.message}`);
    };

    const unsubAreas = subscribeAreas(user, setAreas, onSubError);
    const unsubStations = subscribeStations(user, setStations, onSubError);
    const unsubCriteria = subscribeCriteria(user, setCriteria, onSubError);
    const unsubTemplates = subscribeTemplates(user, setTemplates, onSubError);
    const unsubAudits = subscribeAudits(
      user,
      (items) => {
        setAudits(items);
        setDataLoading(false);
      },
      (err) => {
        setDataLoading(false);
        onSubError(err);
      }
    );

    return () => {
      unsubAreas();
      unsubStations();
      unsubCriteria();
      unsubTemplates();
      unsubAudits();
    };
  }, [authReady, user, notify]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Iniciando Sistema Inteligente de Auditoría 5S...
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  const handleStartNewAudit = () => {
    setSelectedTemplateForAudit(null);
    setActiveNav('auditorias');
  };

  const handleUseTemplateForAudit = (tpl: AuditTemplate) => {
    setSelectedTemplateForAudit(tpl);
    setActiveNav('auditorias');
  };

  const handleInspectAudit = (audit: AuditRecord) => {
    setSelectedAuditForHistory(audit);
    setActiveNav('historial');
  };

  return (
    <Layout
      user={user}
      activeNav={activeNav}
      onNavigate={setActiveNav}
      onStartNewAudit={handleStartNewAudit}
      toasts={toasts}
      onDismissToast={dismissToast}
    >
      {activeNav === 'inicio' ? (
        <DashboardPage
          audits={audits}
          loading={dataLoading}
          onStartNewAudit={handleStartNewAudit}
          onInspectAudit={handleInspectAudit}
        />
      ) : null}

      {activeNav === 'disenador' ? (
        <AiDesignerPage
          user={user}
          templates={templates}
          onNotify={notify}
          onUseTemplateForAudit={handleUseTemplateForAudit}
        />
      ) : null}

      {activeNav === 'auditorias' ? (
        <AuditFormPage
          user={user}
          areas={areas}
          stations={stations}
          criteria={criteria}
          templates={templates}
          initialTemplate={selectedTemplateForAudit}
          onNotify={notify}
          onSaved={() => {
            setSelectedTemplateForAudit(null);
            setActiveNav('historial');
          }}
          onCancel={() => {
            setSelectedTemplateForAudit(null);
            setActiveNav('inicio');
          }}
        />
      ) : null}

      {activeNav === 'historial' ? (
        <HistoryPage
          audits={audits}
          loading={dataLoading}
          initialSelectedAudit={selectedAuditForHistory}
          onClearInitialSelected={() => setSelectedAuditForHistory(null)}
        />
      ) : null}

      {activeNav === 'administracion' ? (
        <AdminPage
          user={user}
          areas={areas}
          stations={stations}
          templates={templates}
          criteria={criteria}
          onNotify={notify}
          onUseTemplateForAudit={handleUseTemplateForAudit}
        />
      ) : null}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
