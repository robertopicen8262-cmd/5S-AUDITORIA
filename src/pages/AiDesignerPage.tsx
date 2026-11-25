import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Code2,
  Cpu,
  Eye,
  FileImage,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { DynamicTemplateRenderer } from '../components/DynamicTemplateRenderer';
import { createTemplate } from '../services/firestoreService';
import type {
  AuditTemplate,
  FormElementType,
  SketchAnalysisResult,
  TemplateElement,
  TemplateSection,
} from '../types/audit';

interface AiDesignerPageProps {
  user: User;
  templates: AuditTemplate[];
  onNotify: (type: 'success' | 'error', text: string) => void;
  onUseTemplateForAudit: (template: AuditTemplate) => void;
}

const ELEMENT_TYPE_LABELS: { value: FormElementType; label: string }[] = [
  { value: 'header', label: 'Encabezado' },
  { value: 'text', label: 'Campo de texto' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'button', label: 'Botón' },
  { value: 'checkbox', label: 'Casilla de verificación' },
  { value: 'radio', label: 'Botón de opción' },
  { value: 'table', label: 'Tabla' },
  { value: 'textarea', label: 'Área de observaciones' },
  { value: 'signature', label: 'Firma' },
];

export const AiDesignerPage: React.FC<AiDesignerPageProps> = ({
  user,
  templates,
  onNotify,
  onUseTemplateForAudit,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [templateHint, setTemplateHint] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<SketchAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'json'>('editor');

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      onNotify('error', 'Solo se admiten imágenes en formato PNG o JPG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onNotify('error', 'La imagen supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    setSelectedFile(file);
    setAnalysisError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeWithGemini = async () => {
    if (!selectedFile || !previewUrl) {
      onNotify('error', 'Primero selecciona una imagen PNG o JPG del boceto.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/ai/analyze-sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: previewUrl,
          mimeType: selectedFile.type as 'image/png' | 'image/jpeg',
          templateHint: templateHint.trim() || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Error al procesar el boceto en el servidor.');
      }

      setAnalysis(payload.analysis as SketchAnalysisResult);
      setActiveTab('editor');
      onNotify('success', 'Boceto analizado correctamente con Gemini IA.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo analizar el boceto.';
      setAnalysisError(message);
      onNotify('error', message);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateSection = (sectionIndex: number, updater: (sec: TemplateSection) => TemplateSection) => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s, idx) => (idx === sectionIndex ? updater(s) : s)),
      };
    });
  };

  const updateElement = (
    sectionIndex: number,
    elementIndex: number,
    patch: Partial<TemplateElement>
  ) => {
    updateSection(sectionIndex, (sec) => ({
      ...sec,
      elements: sec.elements.map((el, idx) => (idx === elementIndex ? { ...el, ...patch } : el)),
    }));
  };

  const removeElement = (sectionIndex: number, elementIndex: number) => {
    updateSection(sectionIndex, (sec) => ({
      ...sec,
      elements: sec.elements.filter((_, idx) => idx !== elementIndex),
    }));
  };

  const addElement = (sectionIndex: number) => {
    const newEl: TemplateElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      label: 'Nuevo campo',
      required: false,
      placeholder: '',
      options: [],
      columns: [],
    };
    updateSection(sectionIndex, (sec) => ({
      ...sec,
      elements: [...sec.elements, newEl],
    }));
  };

  const addSection = () => {
    const newSec: TemplateSection = {
      id: `sec_${Date.now()}`,
      title: 'Nueva Sección',
      description: '',
      elements: [
        {
          id: `el_${Date.now()}_1`,
          type: 'radio',
          label: 'Criterio de verificación',
          required: true,
          placeholder: '',
          options: ['Cumple', 'No cumple', 'N/A'],
          columns: [],
        },
      ],
    };
    setAnalysis((prev) =>
      prev
        ? { ...prev, sections: [...prev.sections, newSec] }
        : {
            formTitle: 'Nueva Plantilla 5S',
            formDescription: 'Plantilla creada manualmente',
            sections: [newSec],
          }
    );
  };

  const removeSection = (sectionIndex: number) => {
    setAnalysis((prev) => {
      if (!prev || prev.sections.length <= 1) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((_, idx) => idx !== sectionIndex),
      };
    });
  };

  const handleSaveTemplate = async () => {
    if (!analysis) {
      onNotify('error', 'Analiza una imagen o crea una estructura de formulario antes de guardar.');
      return;
    }
    if (!analysis.formTitle.trim() || analysis.formTitle.trim().length < 2) {
      onNotify('error', 'El nombre de la plantilla es obligatorio (mínimo 2 caracteres).');
      return;
    }
    if (analysis.sections.length === 0 || analysis.sections.some((s) => s.elements.length === 0)) {
      onNotify('error', 'Cada sección debe contener al menos un elemento identificado.');
      return;
    }

    setSaving(true);
    try {
      await createTemplate(user, {
        name: analysis.formTitle,
        description: analysis.formDescription,
        sourceImageName: selectedFile?.name || 'plantilla_manual.json',
        sourceFile: selectedFile,
        sections: analysis.sections,
        active: true,
      });
      onNotify('success', 'Plantilla guardada en Firebase Firestore correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la plantilla.';
      onNotify('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadExistingTemplate = (tpl: AuditTemplate) => {
    setAnalysis({
      formTitle: tpl.name,
      formDescription: tpl.description,
      sections: tpl.sections,
    });
    setActiveTab('preview');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Diseñador Inteligente de Plantillas con IA
          </h2>
          <p className="text-sm text-slate-600">
            Carga un boceto o formato en PNG/JPG, analízalo con Gemini IA, edita los campos
            reconocidos y genera un formulario web dinámico validado.
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          className="min-h-[40px] px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap self-start"
        >
          <Plus className="w-4 h-4" />
          Nueva sección manual
        </button>
      </div>

      {/* Layout optimizado para tablet horizontal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna izquierda: Carga de imagen y vista previa */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileImage className="w-4 h-4 text-sky-700" />
            1. Carga y Vista Previa del Boceto
          </h3>

          <label className="block border-2 border-dashed border-slate-300 hover:border-sky-600 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50">
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />
            <Upload className="w-8 h-8 text-sky-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">
              Seleccionar imagen PNG o JPG
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Bocetos a mano, hojas de verificación impresas o diagramas de inspección (máx. 10 MB)
            </p>
          </label>

          {previewUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium truncate">{selectedFile?.name}</span>
                <span className="font-mono-tabular shrink-0">
                  {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={previewUrl}
                  alt="Vista previa del boceto de formulario 5S"
                  className="w-full max-h-80 object-contain mx-auto"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Contexto adicional para la IA (opcional)
            </label>
            <input
              type="text"
              value={templateHint}
              onChange={(e) => setTemplateHint(e.target.value)}
              placeholder="Ej. Formato de inspección de celda de ensamble"
              className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {analysisError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {analysisError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleAnalyzeWithGemini}
            disabled={!selectedFile || analyzing}
            className="w-full min-h-[44px] px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando imagen con Gemini IA...
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                Analizar Boceto con Gemini IA
              </>
            )}
          </button>
        </div>

        {/* Columna derecha: Revisión, edición, vista dinámica y JSON */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Editar elementos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Formulario dinámico
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'json'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON validado
              </button>
            </div>

            {analysis ? (
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={saving}
                className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Plantilla'}
              </button>
            ) : null}
          </div>

          {!analysis ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-semibold text-slate-800">
                Sin estructura generada todavía
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sube una imagen de un boceto y presiona &quot;Analizar Boceto con Gemini IA&quot; o
                crea una sección manual para diseñar el formulario dinámico.
              </p>
            </div>
          ) : activeTab === 'editor' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nombre de la plantilla *
                  </label>
                  <input
                    type="text"
                    value={analysis.formTitle}
                    onChange={(e) =>
                      setAnalysis((prev) => (prev ? { ...prev, formTitle: e.target.value } : prev))
                    }
                    className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Descripción</label>
                  <input
                    type="text"
                    value={analysis.formDescription}
                    onChange={(e) =>
                      setAnalysis((prev) =>
                        prev ? { ...prev, formDescription: e.target.value } : prev
                      )
                    }
                    className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              {analysis.sections.map((section, sIdx) => (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateSection(sIdx, (sec) => ({ ...sec, title: e.target.value }))
                      }
                      className="flex-1 min-h-[38px] px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded-lg"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => addElement(sIdx)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Campo
                      </button>
                      {analysis.sections.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSection(sIdx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                          aria-label="Eliminar sección"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {section.elements.map((el, eIdx) => (
                      <div
                        key={el.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] text-slate-500 mb-1">Etiqueta</label>
                          <input
                            type="text"
                            value={el.label}
                            onChange={(e) =>
                              updateElement(sIdx, eIdx, { label: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] text-slate-500 mb-1">Tipo</label>
                          <select
                            value={el.type}
                            onChange={(e) =>
                              updateElement(sIdx, eIdx, {
                                type: e.target.value as FormElementType,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                          >
                            {ELEMENT_TYPE_LABELS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] text-slate-500 mb-1">
                            {el.type === 'table'
                              ? 'Columnas (separadas por coma)'
                              : el.type === 'select' ||
                                el.type === 'checkbox' ||
                                el.type === 'radio'
                              ? 'Opciones (separadas por coma)'
                              : 'Texto de ayuda'}
                          </label>
                          {el.type === 'table' ? (
                            <input
                              type="text"
                              value={el.columns.join(', ')}
                              onChange={(e) =>
                                updateElement(sIdx, eIdx, {
                                  columns: e.target.value
                                    .split(',')
                                    .map((v) => v.trim())
                                    .filter(Boolean),
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                            />
                          ) : el.type === 'select' ||
                            el.type === 'checkbox' ||
                            el.type === 'radio' ? (
                            <input
                              type="text"
                              value={el.options.join(', ')}
                              onChange={(e) =>
                                updateElement(sIdx, eIdx, {
                                  options: e.target.value
                                    .split(',')
                                    .map((v) => v.trim())
                                    .filter(Boolean),
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                            />
                          ) : (
                            <input
                              type="text"
                              value={el.placeholder}
                              onChange={(e) =>
                                updateElement(sIdx, eIdx, { placeholder: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                            />
                          )}
                        </div>

                        <div className="sm:col-span-1 flex items-center justify-end gap-2 pt-4">
                          <button
                            type="button"
                            onClick={() => removeElement(sIdx, eIdx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                            aria-label="Eliminar elemento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'preview' ? (
            <DynamicTemplateRenderer
              title={analysis.formTitle}
              description={analysis.formDescription}
              sections={analysis.sections}
              interactive
              onButtonClick={(el) =>
                onNotify('success', `Botón "${el.label}" ejecutado en vista previa controlada.`)
              }
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Esquema JSON validado y controlado por componentes React (sin ejecución de HTML
                arbitrario).
              </p>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono-tabular overflow-x-auto max-h-[520px]">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Plantillas guardadas en Firestore */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Plantillas Guardadas ({templates.length})
          </h3>
          <p className="text-xs text-slate-500">
            Almacenadas de forma persistente en Firebase Firestore y listas para usarse en auditorías.
          </p>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">
            Aún no has guardado plantillas generadas con IA.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-900">{tpl.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {tpl.description || 'Plantilla generada para inspección industrial'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono-tabular pt-1">
                    {tpl.sections.length} secciones ·{' '}
                    {tpl.sections.reduce((acc, s) => acc + s.elements.length, 0)} elementos
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleLoadExistingTemplate(tpl)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Previsualizar / Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onUseTemplateForAudit(tpl)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
                  >
                    Aplicar auditoría
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
