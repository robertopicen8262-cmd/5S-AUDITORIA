import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSearch,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { AuditClassification, AuditRecord } from '../types/audit';

interface HistoryPageProps {
  audits: AuditRecord[];
  loading: boolean;
  initialSelectedAudit?: AuditRecord | null;
  onClearInitialSelected?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  audits,
  loading,
  initialSelectedAudit,
  onClearInitialSelected,
}) => {
  const [areaOrAuditorQuery, setAreaOrAuditorQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(
    initialSelectedAudit ?? null
  );

  useEffect(() => {
    if (initialSelectedAudit) {
      setSelectedAudit(initialSelectedAudit);
    }
  }, [initialSelectedAudit]);

  const closeDetail = () => {
    setSelectedAudit(null);
    onClearInitialSelected?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAudit) {
        closeDetail();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedAudit]);

  const filteredAudits = useMemo(() => {
    const q = areaOrAuditorQuery.trim().toLowerCase();
    return audits.filter((a) => {
      const matchesText =
        !q ||
        a.areaName.toLowerCase().includes(q) ||
        a.stationName.toLowerCase().includes(q) ||
        a.auditorName.toLowerCase().includes(q) ||
        a.responsibleName.toLowerCase().includes(q);

      const matchesDate = !dateFilter || a.auditDate === dateFilter;
      const matchesClass =
        classificationFilter === 'ALL' || a.classification === classificationFilter;

      return matchesText && matchesDate && matchesClass;
    });
  }, [audits, areaOrAuditorQuery, dateFilter, classificationFilter]);

  const renderResultBadge = (classification: AuditClassification) => {
    if (classification === 'CONFORME') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-emerald-50 border-emerald-200 text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          CONFORME
        </span>
      );
    }
    if (classification === 'OBSERVACIÓN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-amber-50 border-amber-200 text-amber-800 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5" />
          OBSERVACIÓN
        </span>
      );
    }
    if (classification === 'NO CONFORME') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-red-50 border-red-200 text-red-800 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" />
          NO CONFORME
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md bg-slate-100 border-slate-300 text-slate-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        NO CALCULABLE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Historial de Auditorías 5S</h2>
        <p className="text-sm text-slate-600">
          Consulta auditorías guardadas en Firestore por área, fecha, auditor o resultado.
        </p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={areaOrAuditorQuery}
            onChange={(e) => setAreaOrAuditorQuery(e.target.value)}
            placeholder="Buscar por área, estación o nombre del auditor..."
            className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filtrar por fecha"
            className="min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-sky-600"
          />

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(['ALL', 'CONFORME', 'OBSERVACIÓN', 'NO CONFORME'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setClassificationFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  classificationFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'Todas' : status}
              </button>
            ))}
          </div>

          {(areaOrAuditorQuery || dateFilter || classificationFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setAreaOrAuditorQuery('');
                setDateFilter('');
                setClassificationFilter('ALL');
              }}
              className="px-3 py-2 text-xs font-semibold text-sky-700 hover:text-sky-900"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Cargando auditorías desde Firestore...
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <FileSearch className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              No se encontraron auditorías con los criterios seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Ajusta los filtros de búsqueda o registra una nueva auditoría 5S.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Área / Estación</th>
                  <th className="px-4 py-3">Auditor</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3 text-right">Puntuación</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                      {audit.auditDate}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {audit.areaName}
                      {audit.stationName ? (
                        <span className="text-slate-500 font-normal"> / {audit.stationName}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{audit.auditorName}</td>
                    <td className="px-4 py-3 text-slate-600">{audit.responsibleName}</td>
                    <td className="px-4 py-3 text-slate-600">{audit.shift}</td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-slate-900">
                      {audit.scorePercentage !== null ? `${audit.scorePercentage}%` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">{renderResultBadge(audit.classification)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAudit(audit)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle completo */}
      {selectedAudit ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Detalle de Auditoría · {selectedAudit.areaName}
                </h3>
                <p className="text-xs text-slate-600 font-mono-tabular">
                  Fecha: {selectedAudit.auditDate} · Turno: {selectedAudit.shift} · Formato:{' '}
                  {selectedAudit.templateName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
                aria-label="Cerrar detalle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Resumen numérico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Puntuación</p>
                  <p className="text-2xl font-bold font-mono-tabular text-slate-900">
                    {selectedAudit.scorePercentage !== null
                      ? `${selectedAudit.scorePercentage}%`
                      : 'No calculable'}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Resultado</p>
                  <div className="mt-1">{renderResultBadge(selectedAudit.classification)}</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Cumple / Aplicables</p>
                  <p className="text-xl font-bold font-mono-tabular text-slate-900">
                    {selectedAudit.compliantCount} / {selectedAudit.applicableCount}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">No cumple / N/A</p>
                  <p className="text-xl font-bold font-mono-tabular text-slate-900">
                    {selectedAudit.nonCompliantCount} / {selectedAudit.naCount}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div>
                  <span className="text-xs text-slate-500 block">Auditor</span>
                  <span className="font-semibold text-slate-900">{selectedAudit.auditorName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Responsable del área</span>
                  <span className="font-semibold text-slate-900">
                    {selectedAudit.responsibleName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Estación</span>
                  <span className="font-semibold text-slate-900">
                    {selectedAudit.stationName || 'General del área'}
                  </span>
                </div>
              </div>

              {/* Secciones evaluadas */}
              <div className="space-y-4">
                {selectedAudit.sections.map((sec) => (
                  <div key={sec.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900">{sec.title}</h4>
                    <div className="divide-y divide-slate-100">
                      {sec.questions.map((q) => (
                        <div
                          key={q.id}
                          className="py-2 flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-slate-700">{q.question}</span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded border whitespace-nowrap ${
                              q.answer === 'CUMPLE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : q.answer === 'NO_CUMPLE'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {q.answer === 'CUMPLE'
                              ? 'Cumple'
                              : q.answer === 'NO_CUMPLE'
                              ? 'No cumple'
                              : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {sec.observations ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Observaciones: </span>
                        {sec.observations}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {selectedAudit.generalObservations ? (
                <div className="border border-slate-200 rounded-xl p-4 space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Observaciones Generales</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedAudit.generalObservations}
                  </p>
                </div>
              ) : null}

              {/* Firmas guardadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Firma del auditor · {selectedAudit.auditorName}
                  </p>
                  <img
                    src={selectedAudit.auditorSignature}
                    alt={`Firma del auditor ${selectedAudit.auditorName}`}
                    className="w-full h-32 object-contain bg-white border border-slate-100 rounded"
                  />
                </div>
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Firma del responsable · {selectedAudit.responsibleName}
                  </p>
                  <img
                    src={selectedAudit.responsibleSignature}
                    alt={`Firma del responsable ${selectedAudit.responsibleName}`}
                    className="w-full h-32 object-contain bg-white border border-slate-100 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
