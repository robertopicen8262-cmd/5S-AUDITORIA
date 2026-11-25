import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Percent,
  Plus,
  XCircle,
} from 'lucide-react';
import type { AuditClassification, AuditRecord } from '../types/audit';

interface DashboardPageProps {
  audits: AuditRecord[];
  loading: boolean;
  onStartNewAudit: () => void;
  onInspectAudit: (audit: AuditRecord) => void;
}

function getClassificationStyle(classification: AuditClassification) {
  if (classification === 'CONFORME') {
    return {
      text: 'text-emerald-800',
      bg: 'bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
    };
  }
  if (classification === 'OBSERVACIÓN') {
    return {
      text: 'text-amber-800',
      bg: 'bg-amber-50 border-amber-200',
      icon: AlertTriangle,
    };
  }
  if (classification === 'NO CONFORME') {
    return {
      text: 'text-red-800',
      bg: 'bg-red-50 border-red-200',
      icon: XCircle,
    };
  }
  return {
    text: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-200',
    icon: AlertTriangle,
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  audits,
  loading,
  onStartNewAudit,
  onInspectAudit,
}) => {
  const stats = useMemo(() => {
    const total = audits.length;
    const completed = audits.filter((a) => a.status === 'completed').length;
    const approved = audits.filter((a) => a.classification === 'CONFORME').length;
    const nonCompliant = audits.filter((a) => a.classification === 'NO CONFORME').length;

    const calculable = audits.filter((a) => typeof a.scorePercentage === 'number');
    const avgCompliance =
      calculable.length > 0
        ? Math.round(
            (calculable.reduce((acc, a) => acc + (a.scorePercentage ?? 0), 0) /
              calculable.length) *
              10
          ) / 10
        : null;

    return {
      total,
      completed,
      approved,
      nonCompliant,
      avgCompliance,
    };
  }, [audits]);

  const chartData = useMemo(() => {
    return audits
      .filter((a) => typeof a.scorePercentage === 'number')
      .slice(0, 12)
      .reverse()
      .map((a, idx) => ({
        name: `${a.areaName.slice(0, 14)} (${a.auditDate.slice(5)})`,
        puntuacion: a.scorePercentage ?? 0,
        classification: a.classification,
        key: `${a.id}_${idx}`,
      }));
  }, [audits]);

  const distribution = useMemo(() => {
    const conforme = audits.filter((a) => a.classification === 'CONFORME').length;
    const observacion = audits.filter((a) => a.classification === 'OBSERVACIÓN').length;
    const noConforme = audits.filter((a) => a.classification === 'NO CONFORME').length;
    const noCalculable = audits.filter((a) => a.classification === 'NO CALCULABLE').length;
    return [
      { label: 'Conforme (95% - 100%)', count: conforme, color: '#16a34a' },
      { label: 'Observación (85% - <95%)', count: observacion, color: '#d97706' },
      { label: 'No conforme (< 85%)', count: noConforme, color: '#dc2626' },
      { label: 'No calculable', count: noCalculable, color: '#64748b' },
    ];
  }, [audits]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Resumen Operativo de Cumplimiento 5S</h2>
          <p className="text-sm text-slate-600">
            Indicadores calculados exclusivamente con auditorías registradas en Firebase Firestore.
          </p>
        </div>
      </div>

      {/* Tarjetas de indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total de auditorías</span>
            <ClipboardList className="w-4 h-4 text-sky-700" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono-tabular">
            {loading ? '—' : stats.total}
          </p>
          <p className="text-xs text-slate-500">Registros en historial</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Auditorías realizadas</span>
            <ClipboardCheck className="w-4 h-4 text-sky-700" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono-tabular">
            {loading ? '—' : stats.completed}
          </p>
          <p className="text-xs text-slate-500">Firmadas y cerradas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Auditorías aprobadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-700 font-mono-tabular">
            {loading ? '—' : stats.approved}
          </p>
          <p className="text-xs text-slate-500">Cumplimiento 95% a 100%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Auditorías no conformes</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-700 font-mono-tabular">
            {loading ? '—' : stats.nonCompliant}
          </p>
          <p className="text-xs text-slate-500">Debajo de 85%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Promedio de cumplimiento</span>
            <Percent className="w-4 h-4 text-sky-700" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono-tabular">
            {loading ? '—' : stats.avgCompliance !== null ? `${stats.avgCompliance}%` : 'Sin datos'}
          </p>
          <p className="text-xs text-slate-500">Media global aplicable</p>
        </div>
      </div>

      {/* Gráfica y distribución */}
      {audits.length === 0 && !loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900">
              Aún no existen auditorías registradas
            </h3>
            <p className="text-sm text-slate-600">
              Las gráficas de cumplimiento y las métricas históricas se actualizarán en tiempo real
              en cuanto guardes tu primera auditoría 5S.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNewAudit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Realizar primera auditoría 5S
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Gráfica de Resultados de Cumplimiento (%)
                </h3>
                <p className="text-xs text-slate-500">
                  Últimas auditorías evaluables · Línea verde 95% (Conforme) · Línea ámbar 85%
                </p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Cumplimiento']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine y={95} stroke="#16a34a" strokeDasharray="4 4" />
                    <ReferenceLine y={85} stroke="#d97706" strokeDasharray="4 4" />
                    <Bar dataKey="puntuacion" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={
                            entry.puntuacion >= 95
                              ? '#16a34a'
                              : entry.puntuacion >= 85
                              ? '#d97706'
                              : '#dc2626'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No hay auditorías con puntuación calculable para graficar.
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Distribución por Clasificación
              </h3>
              <p className="text-xs text-slate-500">Criterio oficial de evaluación 5S</p>
            </div>
            <div className="space-y-4 pt-2">
              {distribution.map((item) => {
                const pct =
                  audits.length > 0 ? Math.round((item.count / audits.length) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabla reciente */}
      {audits.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Auditorías Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Área / Estación</th>
                  <th className="px-4 py-3">Auditor</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3 text-right">Puntuación</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audits.slice(0, 6).map((audit) => {
                  const badge = getClassificationStyle(audit.classification);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {audit.areaName}
                        {audit.stationName ? (
                          <span className="text-slate-500 font-normal">
                            {' '}
                            / {audit.stationName}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{audit.auditorName}</td>
                      <td className="px-4 py-3 font-mono-tabular text-slate-600">
                        {audit.auditDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{audit.shift}</td>
                      <td className="px-4 py-3 text-right font-mono-tabular font-semibold text-slate-900">
                        {audit.scorePercentage !== null ? `${audit.scorePercentage}%` : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md whitespace-nowrap ${badge.bg} ${badge.text}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          {audit.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectAudit(audit)}
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900 whitespace-nowrap"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
