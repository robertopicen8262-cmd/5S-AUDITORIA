import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Building2,
  CheckSquare,
  Cpu,
  Edit3,
  Eye,
  FileText,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { DynamicTemplateRenderer } from '../components/DynamicTemplateRenderer';
import {
  createArea,
  createCriterion,
  createStation,
  deleteArea,
  deleteCriterion,
  deleteStation,
  deleteTemplate,
  seedStandardCriteriaCatalog,
  updateArea,
  updateCriterion,
  updateStation,
  updateTemplate,
} from '../services/firestoreService';
import type {
  AuditTemplate,
  EvaluationCriterion,
  PillarCode,
  WorkArea,
  WorkStation,
} from '../types/audit';

interface AdminPageProps {
  user: User;
  areas: WorkArea[];
  stations: WorkStation[];
  templates: AuditTemplate[];
  criteria: EvaluationCriterion[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onUseTemplateForAudit: (tpl: AuditTemplate) => void;
}

const PILLAR_TITLES: Record<PillarCode, string> = {
  SEIRI: 'Primera S: SEIRI (CLASIFICAR)',
  SEITON: 'Segunda S: SEITON (ORDENAR)',
  SEISO: 'Tercera S: SEISO (LIMPIAR)',
  SEIKETSU: 'Cuarta S: SEIKETSU (ESTANDARIZAR)',
  SHITSUKE: 'Quinta S: SHITSUKE (DISCIPLINA)',
};

export const AdminPage: React.FC<AdminPageProps> = ({
  user,
  areas,
  stations,
  templates,
  criteria,
  onNotify,
  onUseTemplateForAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'stations' | 'templates' | 'criteria'>(
    'areas'
  );

  // Estado Áreas
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [areaSupervisor, setAreaSupervisor] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [areaActive, setAreaActive] = useState(true);
  const [savingArea, setSavingArea] = useState(false);

  // Estado Estaciones
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationAreaId, setStationAreaId] = useState('');
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [stationLine, setStationLine] = useState('');
  const [stationActive, setStationActive] = useState(true);
  const [savingStation, setSavingStation] = useState(false);

  // Estado Plantillas
  const [previewTemplate, setPreviewTemplate] = useState<AuditTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AuditTemplate | null>(null);
  const [tplNameEdit, setTplNameEdit] = useState('');
  const [tplDescEdit, setTplDescEdit] = useState('');

  // Estado Criterios
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [critPillar, setCritPillar] = useState<PillarCode>('SEIRI');
  const [critQuestion, setCritQuestion] = useState('');
  const [critDesc, setCritDesc] = useState('');
  const [critOrder, setCritOrder] = useState(1);
  const [critActive, setCritActive] = useState(true);
  const [savingCrit, setSavingCrit] = useState(false);

  // Handlers Áreas
  const resetAreaForm = () => {
    setEditingAreaId(null);
    setAreaName('');
    setAreaCode('');
    setAreaSupervisor('');
    setAreaDescription('');
    setAreaActive(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (areaName.trim().length < 2 || !areaCode.trim()) {
      onNotify('error', 'El nombre (mín. 2 caracteres) y código del área son obligatorios.');
      return;
    }
    setSavingArea(true);
    try {
      if (editingAreaId) {
        await updateArea(editingAreaId, {
          name: areaName,
          code: areaCode,
          supervisor: areaSupervisor,
          description: areaDescription,
          active: areaActive,
        });
        onNotify('success', 'Área de trabajo actualizada en Firestore.');
      } else {
        await createArea(user, {
          name: areaName,
          code: areaCode,
          supervisor: areaSupervisor,
          description: areaDescription,
          active: areaActive,
        });
        onNotify('success', 'Área de trabajo registrada correctamente.');
      }
      resetAreaForm();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Error al guardar el área.');
    } finally {
      setSavingArea(false);
    }
  };

  // Handlers Estaciones
  const resetStationForm = () => {
    setEditingStationId(null);
    setStationAreaId('');
    setStationName('');
    setStationCode('');
    setStationLine('');
    setStationActive(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetArea = areas.find((a) => a.id === stationAreaId);
    if (!targetArea) {
      onNotify('error', 'Selecciona un área de trabajo existente para vincular la estación.');
      return;
    }
    if (stationName.trim().length < 2 || !stationCode.trim()) {
      onNotify('error', 'El nombre y código de la estación son obligatorios.');
      return;
    }
    setSavingStation(true);
    try {
      if (editingStationId) {
        await updateStation(editingStationId, {
          areaId: targetArea.id,
          areaName: targetArea.name,
          name: stationName,
          code: stationCode,
          line: stationLine,
          active: stationActive,
        });
        onNotify('success', 'Estación actualizada correctamente.');
      } else {
        await createStation(user, {
          areaId: targetArea.id,
          areaName: targetArea.name,
          name: stationName,
          code: stationCode,
          line: stationLine,
          active: stationActive,
        });
        onNotify('success', 'Estación creada y vinculada al área.');
      }
      resetStationForm();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Error al guardar la estación.');
    } finally {
      setSavingStation(false);
    }
  };

  // Handlers Criterios
  const resetCriterionForm = () => {
    setEditingCriterionId(null);
    setCritPillar('SEIRI');
    setCritQuestion('');
    setCritDesc('');
    setCritOrder(criteria.length + 1);
    setCritActive(true);
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (critQuestion.trim().length < 3) {
      onNotify('error', 'La pregunta del criterio debe tener al menos 3 caracteres.');
      return;
    }
    setSavingCrit(true);
    try {
      if (editingCriterionId) {
        await updateCriterion(editingCriterionId, {
          pillar: critPillar,
          pillarTitle: PILLAR_TITLES[critPillar],
          question: critQuestion,
          description: critDesc,
          order: critOrder,
          active: critActive,
        });
        onNotify('success', 'Criterio de evaluación actualizado.');
      } else {
        await createCriterion(user, {
          pillar: critPillar,
          pillarTitle: PILLAR_TITLES[critPillar],
          question: critQuestion,
          description: critDesc,
          order: critOrder,
          active: critActive,
        });
        onNotify('success', 'Criterio de evaluación guardado.');
      }
      resetCriterionForm();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Error al guardar el criterio.');
    } finally {
      setSavingCrit(false);
    }
  };

  const handleSeedCriteria = async () => {
    try {
      await seedStandardCriteriaCatalog(user);
      onNotify('success', 'Los 15 criterios estándar 5S fueron cargados en Firestore.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Error al inicializar criterios.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Administración del Sistema</h2>
        <p className="text-sm text-slate-600">
          Gestiona áreas de trabajo, estaciones, plantillas de auditoría y criterios de evaluación
          5S.
        </p>
      </div>

      {/* Navegación por sub-módulos */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto self-start w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('areas')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'areas'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Áreas ({areas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stations')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'stations'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Estaciones ({stations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Plantillas ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('criteria')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'criteria'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Criterios 5S ({criteria.length})
        </button>
      </div>

      {/* TAB 1: ÁREAS */}
      {activeTab === 'areas' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveArea}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              {editingAreaId ? 'Editar Área de Trabajo' : 'Nueva Área de Trabajo'}
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Nombre *</label>
              <input
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Ej. Ensamble Final"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Código *</label>
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="Ej. AREA-ENS-01"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Supervisor</label>
              <input
                type="text"
                value={areaSupervisor}
                onChange={(e) => setAreaSupervisor(e.target.value)}
                placeholder="Responsable del área"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Descripción</label>
              <textarea
                rows={2}
                value={areaDescription}
                onChange={(e) => setAreaDescription(e.target.value)}
                placeholder="Alcance operativo del área"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={areaActive}
                onChange={(e) => setAreaActive(e.target.checked)}
                className="w-4 h-4 accent-sky-700"
              />
              Área activa para auditorías
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingArea}
                className="flex-1 min-h-[42px] px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {savingArea ? 'Guardando...' : editingAreaId ? 'Actualizar' : 'Agregar Área'}
              </button>
              {editingAreaId ? (
                <button
                  type="button"
                  onClick={resetAreaForm}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {areas.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay áreas registradas todavía. Crea la primera área en el formulario lateral.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Área</th>
                      <th className="px-4 py-3">Supervisor</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {areas.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono-tabular text-xs font-semibold text-slate-700">
                          {a.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                        <td className="px-4 py-3 text-slate-600">{a.supervisor || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <span className={a.active ? 'text-emerald-700' : 'text-slate-400'}>
                            {a.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAreaId(a.id);
                              setAreaName(a.name);
                              setAreaCode(a.code);
                              setAreaSupervisor(a.supervisor);
                              setAreaDescription(a.description);
                              setAreaActive(a.active);
                            }}
                            className="p-1.5 text-slate-600 hover:text-sky-700"
                            aria-label="Editar área"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteArea(a.id);
                                onNotify('success', 'Área eliminada.');
                              } catch (err) {
                                onNotify(
                                  'error',
                                  err instanceof Error ? err.message : 'Error al eliminar.'
                                );
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                            aria-label="Eliminar área"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 2: ESTACIONES */}
      {activeTab === 'stations' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveStation}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              {editingStationId ? 'Editar Estación' : 'Nueva Estación'}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Área vinculada *
              </label>
              <select
                value={stationAreaId}
                onChange={(e) => setStationAreaId(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="">Seleccionar área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
              {areas.length === 0 ? (
                <p className="text-[11px] text-amber-700">
                  Primero registra un área en la pestaña Áreas.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Nombre de estación *
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="Ej. Celda Soldadura Robot 02"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Código *</label>
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                placeholder="Ej. EST-02"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Línea / Turno</label>
              <input
                type="text"
                value={stationLine}
                onChange={(e) => setStationLine(e.target.value)}
                placeholder="Ej. Línea B"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={stationActive}
                onChange={(e) => setStationActive(e.target.checked)}
                className="w-4 h-4 accent-sky-700"
              />
              Estación activa
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingStation || areas.length === 0}
                className="flex-1 min-h-[42px] px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {savingStation
                  ? 'Guardando...'
                  : editingStationId
                  ? 'Actualizar'
                  : 'Agregar Estación'}
              </button>
              {editingStationId ? (
                <button
                  type="button"
                  onClick={resetStationForm}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {stations.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay estaciones registradas todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Estación</th>
                      <th className="px-4 py-3">Área</th>
                      <th className="px-4 py-3">Línea</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stations.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono-tabular text-xs font-semibold text-slate-700">
                          {st.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{st.name}</td>
                        <td className="px-4 py-3 text-slate-600">{st.areaName}</td>
                        <td className="px-4 py-3 text-slate-600">{st.line || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <span className={st.active ? 'text-emerald-700' : 'text-slate-400'}>
                            {st.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStationId(st.id);
                              setStationAreaId(st.areaId);
                              setStationName(st.name);
                              setStationCode(st.code);
                              setStationLine(st.line);
                              setStationActive(st.active);
                            }}
                            className="p-1.5 text-slate-600 hover:text-sky-700"
                            aria-label="Editar estación"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteStation(st.id);
                                onNotify('success', 'Estación eliminada.');
                              } catch (err) {
                                onNotify(
                                  'error',
                                  err instanceof Error ? err.message : 'Error al eliminar.'
                                );
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                            aria-label="Eliminar estación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 3: PLANTILLAS */}
      {activeTab === 'templates' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {templates.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                No hay plantillas personalizadas almacenadas
              </p>
              <p className="text-xs text-slate-500">
                Genera plantillas desde el módulo Diseñador con IA analizando bocetos en PNG o JPG.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Secciones</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{tpl.name}</p>
                        <p className="text-xs text-slate-500">{tpl.description || 'Sin descripción'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {tpl.sourceImageName || 'Manual'}
                      </td>
                      <td className="px-4 py-3 font-mono-tabular text-slate-700">
                        {tpl.sections.length}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateTemplate(tpl.id, {
                                name: tpl.name,
                                description: tpl.description,
                                sections: tpl.sections,
                                active: !tpl.active,
                              });
                              onNotify('success', 'Estado de plantilla actualizado.');
                            } catch (err) {
                              onNotify(
                                'error',
                                err instanceof Error ? err.message : 'Error al actualizar.'
                              );
                            }
                          }}
                          className={tpl.active ? 'text-emerald-700' : 'text-slate-400'}
                        >
                          {tpl.active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(tpl)}
                          className="p-1.5 text-slate-600 hover:text-sky-700"
                          aria-label="Previsualizar plantilla"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTplNameEdit(tpl.name);
                            setTplDescEdit(tpl.description);
                          }}
                          className="p-1.5 text-slate-600 hover:text-sky-700"
                          aria-label="Editar plantilla"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUseTemplateForAudit(tpl)}
                          className="px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md"
                        >
                          Auditar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteTemplate(tpl.id);
                              onNotify('success', 'Plantilla eliminada.');
                            } catch (err) {
                              onNotify(
                                'error',
                                err instanceof Error ? err.message : 'Error al eliminar.'
                              );
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                          aria-label="Eliminar plantilla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 4: CRITERIOS DE EVALUACIÓN */}
      {activeTab === 'criteria' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCriterion}
            className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              {editingCriterionId ? 'Editar Criterio 5S' : 'Nuevo Criterio de Evaluación'}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Pilar 5S *</label>
              <select
                value={critPillar}
                onChange={(e) => setCritPillar(e.target.value as PillarCode)}
                className="w-full min-h-[40px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {(Object.keys(PILLAR_TITLES) as PillarCode[]).map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_TITLES[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Pregunta de evaluación *
              </label>
              <input
                type="text"
                value={critQuestion}
                onChange={(e) => setCritQuestion(e.target.value)}
                placeholder="Ej. ¿Tablero de herramientas completo?"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Guía de verificación
              </label>
              <textarea
                rows={2}
                value={critDesc}
                onChange={(e) => setCritDesc(e.target.value)}
                placeholder="Detalle para el auditor..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Orden</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={critOrder}
                  onChange={(e) => setCritOrder(Number(e.target.value) || 1)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 pt-5">
                <input
                  type="checkbox"
                  checked={critActive}
                  onChange={(e) => setCritActive(e.target.checked)}
                  className="w-4 h-4 accent-sky-700"
                />
                Activo
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingCrit}
                className="flex-1 min-h-[42px] px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {savingCrit
                  ? 'Guardando...'
                  : editingCriterionId
                  ? 'Actualizar'
                  : 'Agregar Criterio'}
              </button>
              {editingCriterionId ? (
                <button
                  type="button"
                  onClick={resetCriterionForm}
                  className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {criteria.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  No hay criterios personalizados en Firestore (las auditorías usan los 15 criterios
                  estándar 5S por defecto).
                </p>
                <button
                  type="button"
                  onClick={handleSeedCriteria}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  Cargar 15 criterios estándar 5S para editarlos
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Orden</th>
                      <th className="px-4 py-3">Pilar</th>
                      <th className="px-4 py-3">Pregunta</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criteria.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono-tabular text-xs text-slate-600">
                          {c.order}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-sky-800">{c.pillar}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{c.question}</td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <span className={c.active ? 'text-emerald-700' : 'text-slate-400'}>
                            {c.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCriterionId(c.id);
                              setCritPillar(c.pillar);
                              setCritQuestion(c.question);
                              setCritDesc(c.description);
                              setCritOrder(c.order);
                              setCritActive(c.active);
                            }}
                            className="p-1.5 text-slate-600 hover:text-sky-700"
                            aria-label="Editar criterio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteCriterion(c.id);
                                onNotify('success', 'Criterio eliminado.');
                              } catch (err) {
                                onNotify(
                                  'error',
                                  err instanceof Error ? err.message : 'Error al eliminar.'
                                );
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                            aria-label="Eliminar criterio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal Previsualización de Plantilla */}
      {previewTemplate ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                Vista previa de plantilla: {previewTemplate.name}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <DynamicTemplateRenderer
                title={previewTemplate.name}
                description={previewTemplate.description}
                sections={previewTemplate.sections}
                interactive
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Editar Metadatos de Plantilla */}
      {editingTemplate ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900">Editar Plantilla</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Nombre *</label>
              <input
                type="text"
                value={tplNameEdit}
                onChange={(e) => setTplNameEdit(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Descripción</label>
              <textarea
                rows={3}
                value={tplDescEdit}
                onChange={(e) => setTplDescEdit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (tplNameEdit.trim().length < 2) {
                    onNotify('error', 'El nombre de la plantilla debe tener al menos 2 caracteres.');
                    return;
                  }
                  try {
                    await updateTemplate(editingTemplate.id, {
                      name: tplNameEdit,
                      description: tplDescEdit,
                      sections: editingTemplate.sections,
                      active: editingTemplate.active,
                    });
                    onNotify('success', 'Plantilla actualizada correctamente.');
                    setEditingTemplate(null);
                  } catch (err) {
                    onNotify('error', err instanceof Error ? err.message : 'Error al actualizar.');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold bg-sky-700 text-white rounded-lg"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
