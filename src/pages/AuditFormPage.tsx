import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Minus,
  RotateCcw,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import { DynamicTemplateRenderer } from '../components/DynamicTemplateRenderer';
import { SignaturePad } from '../components/SignaturePad';
import { createAudit } from '../services/firestoreService';
import type {
  AnswerValue,
  AuditSectionResult,
  AuditTemplate,
  EvaluationCriterion,
  ShiftType,
  WorkArea,
  WorkStation,
} from '../types/audit';
import { buildSectionsFromCriteria, calculateAuditScore } from '../utils/scoring';

interface AuditFormPageProps {
  user: User;
  areas: WorkArea[];
  stations: WorkStation[];
  criteria: EvaluationCriterion[];
  templates: AuditTemplate[];
  initialTemplate?: AuditTemplate | null;
  onNotify: (type: 'success' | 'error', text: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}

const SHIFTS: ShiftType[] = ['Matutino', 'Vespertino', 'Nocturno', 'Mixto'];

function buildSectionsFromTemplate(tpl: AuditTemplate): AuditSectionResult[] {
  return tpl.sections.map((sec) => {
    const evaluable = sec.elements.filter(
      (el) => el.type === 'radio' || el.type === 'checkbox' || el.type === 'text'
    );
    const questions =
      evaluable.length > 0
        ? evaluable.map((el) => ({
            id: el.id,
            question: el.label,
            answer: null as AnswerValue | null,
          }))
        : [
            {
              id: `${sec.id}_q1`,
              question: `Cumplimiento general de sección: ${sec.title}`,
              answer: null as AnswerValue | null,
            },
          ];

    return {
      id: sec.id,
      pillar: sec.title.slice(0, 32),
      title: sec.title,
      questions,
      observations: '',
    };
  });
}

export const AuditFormPage: React.FC<AuditFormPageProps> = ({
  user,
  areas,
  stations,
  criteria,
  templates,
  initialTemplate,
  onNotify,
  onSaved,
  onCancel,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplate?.id || 'standard_5s'
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [manualAreaName, setManualAreaName] = useState<string>('');
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [manualStationName, setManualStationName] = useState<string>('');
  const [auditorName, setAuditorName] = useState<string>(user.displayName || '');
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [shift, setShift] = useState<ShiftType>('Matutino');
  const [sections, setSections] = useState<AuditSectionResult[]>(() =>
    initialTemplate
      ? buildSectionsFromTemplate(initialTemplate)
      : buildSectionsFromCriteria(criteria)
  );
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({});
  const [generalObservations, setGeneralObservations] = useState<string>('');
  const [auditorSignature, setAuditorSignature] = useState<string>('');
  const [responsibleSignature, setResponsibleSignature] = useState<string>('');

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeAreas = useMemo(() => areas.filter((a) => a.active), [areas]);
  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);

  const filteredStations = useMemo(() => {
    if (!selectedAreaId) return [];
    return stations.filter((s) => s.active && s.areaId === selectedAreaId);
  }, [stations, selectedAreaId]);

  const activeTemplate = useMemo(
    () => activeTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [activeTemplates, selectedTemplateId]
  );

  useEffect(() => {
    if (initialTemplate) {
      setSelectedTemplateId(initialTemplate.id);
      setSections(buildSectionsFromTemplate(initialTemplate));
    }
  }, [initialTemplate]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setDynamicValues({});
    if (templateId === 'standard_5s') {
      setSections(buildSectionsFromCriteria(criteria));
    } else {
      const found = activeTemplates.find((t) => t.id === templateId);
      if (found) {
        setSections(buildSectionsFromTemplate(found));
      }
    }
  };

  const handleAnswerChange = (sectionIdx: number, questionIdx: number, answer: AnswerValue) => {
    setSections((prev) =>
      prev.map((sec, sIdx) =>
        sIdx !== sectionIdx
          ? sec
          : {
              ...sec,
              questions: sec.questions.map((q, qIdx) =>
                qIdx !== questionIdx ? q : { ...q, answer }
              ),
            }
      )
    );
  };

  const handleSectionObservationChange = (sectionIdx: number, text: string) => {
    setSections((prev) =>
      prev.map((sec, sIdx) => (sIdx !== sectionIdx ? sec : { ...sec, observations: text }))
    );
  };

  const scoreSummary = useMemo(() => calculateAuditScore(sections), [sections]);

  const handleReset = () => {
    setSelectedAreaId('');
    setManualAreaName('');
    setSelectedStationId('');
    setManualStationName('');
    setResponsibleName('');
    setGeneralObservations('');
    setAuditorSignature('');
    setResponsibleSignature('');
    setValidationErrors({});
    setDynamicValues({});
    if (selectedTemplateId === 'standard_5s') {
      setSections(buildSectionsFromCriteria(criteria));
    } else if (activeTemplate) {
      setSections(buildSectionsFromTemplate(activeTemplate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const resolvedAreaObj = activeAreas.find((a) => a.id === selectedAreaId);
    const resolvedAreaName = resolvedAreaObj ? resolvedAreaObj.name : manualAreaName.trim();

    const resolvedStationObj = filteredStations.find((s) => s.id === selectedStationId);
    const resolvedStationName = resolvedStationObj
      ? resolvedStationObj.name
      : manualStationName.trim();

    if (!resolvedAreaName) {
      errors.area = 'Selecciona o ingresa el área o estación de trabajo.';
    }
    if (!auditorName.trim() || auditorName.trim().length < 2) {
      errors.auditorName = 'El nombre del auditor es obligatorio (mín. 2 caracteres).';
    }
    if (!responsibleName.trim() || responsibleName.trim().length < 2) {
      errors.responsibleName = 'El nombre del responsable es obligatorio (mín. 2 caracteres).';
    }
    if (!auditDate) {
      errors.auditDate = 'La fecha de auditoría es obligatoria.';
    }

    const unansweredCount = sections.reduce(
      (acc, sec) => acc + sec.questions.filter((q) => q.answer === null).length,
      0
    );
    if (unansweredCount > 0) {
      errors.questions = `Faltan ${unansweredCount} preguntas por evaluar (selecciona Cumple, No cumple o N/A).`;
    }

    if (!auditorSignature) {
      errors.auditorSignature = 'La firma del auditor es obligatoria.';
    }
    if (!responsibleSignature) {
      errors.responsibleSignature = 'La firma del responsable es obligatoria.';
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      onNotify('error', 'Revisa los campos obligatorios marcados antes de guardar la auditoría.');
      return;
    }

    setSaving(true);
    try {
      await createAudit(user, {
        templateId: activeTemplate ? activeTemplate.id : 'standard_5s',
        templateName: activeTemplate ? activeTemplate.name : 'Auditoría Estándar 5S',
        areaId: resolvedAreaObj?.id || '',
        areaName: resolvedAreaName,
        stationId: resolvedStationObj?.id || '',
        stationName: resolvedStationName,
        auditorName: auditorName.trim(),
        responsibleName: responsibleName.trim(),
        auditDate,
        shift,
        sections,
        totalQuestions: scoreSummary.totalQuestions,
        applicableCount: scoreSummary.applicableCount,
        compliantCount: scoreSummary.compliantCount,
        nonCompliantCount: scoreSummary.nonCompliantCount,
        naCount: scoreSummary.naCount,
        scorePercentage: scoreSummary.scorePercentage,
        classification: scoreSummary.classification,
        generalObservations: generalObservations.trim(),
        auditorSignature,
        responsibleSignature,
      });
      onNotify('success', 'Auditoría 5S guardada correctamente en Firebase Firestore.');
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar la auditoría.';
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Ejecución de Auditoría 5S</h2>
          <p className="text-sm text-slate-600">
            Evalúa cada pilar, registra observaciones y captura las firmas de conformidad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Formato:
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="min-h-[40px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          >
            <option value="standard_5s">Formato Estándar 5S (Oficial)</option>
            {activeTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                Plantilla IA: {tpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layout optimizado para tablet horizontal: 8 columnas formulario + 4 columnas panel resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Datos Generales */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Datos Generales de la Inspección
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">
                  Área de trabajo *
                </label>
                {activeAreas.length > 0 ? (
                  <select
                    value={selectedAreaId}
                    onChange={(e) => {
                      setSelectedAreaId(e.target.value);
                      setSelectedStationId('');
                    }}
                    className={`w-full min-h-[44px] px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                      validationErrors.area ? 'border-red-400' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Selecciona un área registrada...</option>
                    {activeAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={manualAreaName}
                    onChange={(e) => setManualAreaName(e.target.value)}
                    placeholder="Ej. Línea de Ensamble 1 / Almacén"
                    className={`w-full min-h-[44px] px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                      validationErrors.area ? 'border-red-400' : 'border-slate-300'
                    }`}
                  />
                )}
                {validationErrors.area ? (
                  <p className="text-xs text-red-600">{validationErrors.area}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">
                  Estación o celda
                </label>
                {filteredStations.length > 0 ? (
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    <option value="">Toda el área / Seleccionar estación...</option>
                    {filteredStations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.code} · {st.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={manualStationName}
                    onChange={(e) => setManualStationName(e.target.value)}
                    placeholder="Opcional: Estación o celda específica"
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">
                  Nombre del auditor *
                </label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  placeholder="Nombre completo del auditor"
                  className={`w-full min-h-[44px] px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                    validationErrors.auditorName ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                {validationErrors.auditorName ? (
                  <p className="text-xs text-red-600">{validationErrors.auditorName}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">
                  Nombre del responsable del área *
                </label>
                <input
                  type="text"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Supervisor o líder responsable"
                  className={`w-full min-h-[44px] px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                    validationErrors.responsibleName ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                {validationErrors.responsibleName ? (
                  <p className="text-xs text-red-600">{validationErrors.responsibleName}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">Fecha *</label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className={`w-full min-h-[44px] px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 font-mono-tabular ${
                    validationErrors.auditDate ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-800">Turno *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SHIFTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        shift === s
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {activeTemplate ? (
            <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-sky-900">
                Campos complementarios de plantilla IA: {activeTemplate.name}
              </p>
              <DynamicTemplateRenderer
                title={activeTemplate.name}
                description={activeTemplate.description}
                sections={activeTemplate.sections}
                values={dynamicValues}
                onValueChange={(elId, val) =>
                  setDynamicValues((prev) => ({ ...prev, [elId]: val }))
                }
              />
            </div>
          ) : null}

          {validationErrors.questions ? (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {validationErrors.questions}
            </div>
          ) : null}

          {/* Secciones 5S */}
          {sections.map((section, sIdx) => (
            <div
              key={section.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {section.questions.filter((q) => q.answer !== null).length}/
                  {section.questions.length} evaluadas
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {section.questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <p className="text-sm font-medium text-slate-800 flex-1">
                      {qIdx + 1}. {q.question}
                    </p>

                    <div className="grid grid-cols-3 gap-2 shrink-0 md:w-80">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(sIdx, qIdx, 'CUMPLE')}
                        className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${
                          q.answer === 'CUMPLE'
                            ? 'bg-emerald-600 border-emerald-700 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Cumple
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnswerChange(sIdx, qIdx, 'NO_CUMPLE')}
                        className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${
                          q.answer === 'NO_CUMPLE'
                            ? 'bg-red-600 border-red-700 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-red-50'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        No cumple
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnswerChange(sIdx, qIdx, 'NA')}
                        className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${
                          q.answer === 'NA'
                            ? 'bg-slate-700 border-slate-800 text-white'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                        N/A
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Observaciones de {section.title}
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={section.observations}
                  onChange={(e) => handleSectionObservationChange(sIdx, e.target.value)}
                  placeholder="Registra hallazgos, ubicaciones o acciones inmediatas..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white"
                />
              </div>
            </div>
          ))}

          {/* Observaciones Generales y Firmas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-900">
                Observaciones Generales y Plan de Seguimiento
              </label>
              <textarea
                rows={3}
                maxLength={1500}
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="Resumen general de la auditoría, compromisos y fecha objetivo de cierre..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
              <SignaturePad
                label="Firma del auditor *"
                signerName={auditorName}
                value={auditorSignature}
                onChange={setAuditorSignature}
                error={validationErrors.auditorSignature}
              />
              <SignaturePad
                label="Firma del responsable *"
                signerName={responsibleName}
                value={responsibleSignature}
                onChange={setResponsibleSignature}
                error={validationErrors.responsibleSignature}
              />
            </div>
          </div>
        </div>

        {/* Panel derecho sticky: Puntuación automática y acciones */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-sky-700" />
                Puntuación Automática
              </h3>
              <span className="text-xs font-mono-tabular text-slate-500">
                {scoreSummary.answeredCount}/{scoreSummary.totalQuestions}
              </span>
            </div>

            <div className="text-center py-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              {scoreSummary.scorePercentage !== null ? (
                <p className="text-4xl font-bold text-slate-900 font-mono-tabular">
                  {scoreSummary.scorePercentage}%
                </p>
              ) : (
                <p className="text-lg font-bold text-slate-700 px-3">
                  Sin puntuación calculable
                </p>
              )}

              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded-md ${
                    scoreSummary.classification === 'CONFORME'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : scoreSummary.classification === 'OBSERVACIÓN'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : scoreSummary.classification === 'NO CONFORME'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  {scoreSummary.classification === 'CONFORME' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : scoreSummary.classification === 'NO CONFORME' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {scoreSummary.classification}
                </span>
              </div>

              <p className="text-xs text-slate-600 px-4">{scoreSummary.statusMessage}</p>
            </div>

            <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Respuestas Cumple</span>
                <span className="font-mono-tabular font-semibold text-emerald-700">
                  {scoreSummary.compliantCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Respuestas No cumple</span>
                <span className="font-mono-tabular font-semibold text-red-700">
                  {scoreSummary.nonCompliantCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Respuestas N/A (excluidas)</span>
                <span className="font-mono-tabular font-semibold text-slate-600">
                  {scoreSummary.naCount}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="font-semibold text-slate-800">Respuestas aplicables</span>
                <span className="font-mono-tabular font-bold text-slate-900">
                  {scoreSummary.applicableCount}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-700">Escala oficial de clasificación:</p>
              <p>95% a 100%: CONFORME</p>
              <p>85% a menos de 95%: OBSERVACIÓN</p>
              <p>Menos de 85%: NO CONFORME</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[46px] px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando en Firebase...' : 'Guardar Auditoría'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[42px] px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reiniciar
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-[42px] px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
