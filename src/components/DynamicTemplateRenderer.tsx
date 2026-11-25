import React, { useState } from 'react';
import { CheckSquare, CircleDot, Table2 } from 'lucide-react';
import type { TemplateElement, TemplateSection } from '../types/audit';
import { SignaturePad } from './SignaturePad';

interface DynamicTemplateRendererProps {
  title: string;
  description?: string;
  sections: TemplateSection[];
  interactive?: boolean;
  values?: Record<string, unknown>;
  onValueChange?: (elementId: string, value: unknown) => void;
  onButtonClick?: (element: TemplateElement) => void;
}

export const DynamicTemplateRenderer: React.FC<DynamicTemplateRendererProps> = ({
  title,
  description,
  sections,
  interactive = true,
  values,
  onValueChange,
  onButtonClick,
}) => {
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const currentValues = values ?? localValues;

  const setValue = (id: string, val: unknown) => {
    if (!interactive) return;
    if (onValueChange) {
      onValueChange(id, val);
    } else {
      setLocalValues((prev) => ({ ...prev, [id]: val }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title || 'Plantilla de Formulario'}</h3>
        {description ? <p className="text-sm text-slate-600 mt-1">{description}</p> : null}
      </div>

      {sections.map((section, sIndex) => (
        <div
          key={section.id}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-base font-semibold text-slate-900">
              {sIndex + 1}. {section.title}
            </h4>
            {section.description ? (
              <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.elements.map((el) => {
              const currentVal = currentValues[el.id];

              if (el.type === 'header') {
                return (
                  <div key={el.id} className="md:col-span-2 pt-2 border-b border-slate-100 pb-2">
                    <h5 className="text-sm font-semibold text-slate-800">{el.label}</h5>
                  </div>
                );
              }

              if (el.type === 'text') {
                return (
                  <div key={el.id} className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-800">
                      {el.label}
                      {el.required ? <span className="text-red-600 ml-1">*</span> : null}
                    </label>
                    <input
                      type="text"
                      disabled={!interactive}
                      value={typeof currentVal === 'string' ? currentVal : ''}
                      onChange={(e) => setValue(el.id, e.target.value)}
                      placeholder={el.placeholder || `Ingrese ${el.label.toLowerCase()}`}
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 disabled:bg-slate-50"
                    />
                  </div>
                );
              }

              if (el.type === 'select') {
                const opts = el.options.length > 0 ? el.options : ['Opción 1', 'Opción 2'];
                return (
                  <div key={el.id} className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-800">
                      {el.label}
                      {el.required ? <span className="text-red-600 ml-1">*</span> : null}
                    </label>
                    <select
                      disabled={!interactive}
                      value={typeof currentVal === 'string' ? currentVal : ''}
                      onChange={(e) => setValue(el.id, e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 disabled:bg-slate-50"
                    >
                      <option value="">Seleccionar...</option>
                      {opts.map((opt, i) => (
                        <option key={`${el.id}_opt_${i}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (el.type === 'checkbox') {
                const opts = el.options.length > 0 ? el.options : ['Verificado'];
                const selected = Array.isArray(currentVal) ? (currentVal as string[]) : [];
                return (
                  <div key={el.id} className="md:col-span-2 space-y-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      <CheckSquare className="w-4 h-4 text-sky-700" />
                      {el.label}
                      {el.required ? <span className="text-red-600">*</span> : null}
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {opts.map((opt, i) => {
                        const checked = selected.includes(opt);
                        return (
                          <label
                            key={`${el.id}_chk_${i}`}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                              checked
                                ? 'bg-sky-50 border-sky-600 text-sky-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!interactive}
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setValue(el.id, [...selected, opt]);
                                } else {
                                  setValue(
                                    el.id,
                                    selected.filter((item) => item !== opt)
                                  );
                                }
                              }}
                              className="w-4 h-4 accent-sky-700"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (el.type === 'radio') {
                const opts =
                  el.options.length > 0 ? el.options : ['Cumple', 'No cumple', 'N/A'];
                return (
                  <div key={el.id} className="md:col-span-2 space-y-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      <CircleDot className="w-4 h-4 text-sky-700" />
                      {el.label}
                      {el.required ? <span className="text-red-600">*</span> : null}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {opts.map((opt, i) => {
                        const active = currentVal === opt;
                        return (
                          <button
                            key={`${el.id}_rad_${i}`}
                            type="button"
                            disabled={!interactive}
                            onClick={() => setValue(el.id, opt)}
                            className={`min-h-[42px] px-3 py-2 text-sm font-medium rounded-lg border text-left transition-colors ${
                              active
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (el.type === 'table') {
                const cols =
                  el.columns.length > 0 ? el.columns : ['Criterio', 'Estado', 'Observación'];
                const rows = Array.isArray(currentVal)
                  ? (currentVal as Record<string, string>[])
                  : [{}, {}, {}];
                return (
                  <div key={el.id} className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <Table2 className="w-4 h-4 text-sky-700" />
                        {el.label}
                      </span>
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => setValue(el.id, [...rows, {}])}
                          className="text-xs font-medium text-sky-700 hover:text-sky-900"
                        >
                          + Agregar fila
                        </button>
                      ) : null}
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                          <tr>
                            {cols.map((col, idx) => (
                              <th key={`${el.id}_col_${idx}`} className="px-3 py-2.5">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((row, rIdx) => (
                            <tr key={`${el.id}_row_${rIdx}`}>
                              {cols.map((col, cIdx) => (
                                <td key={`${el.id}_cell_${rIdx}_${cIdx}`} className="p-1.5">
                                  <input
                                    type="text"
                                    disabled={!interactive}
                                    value={row[col] || ''}
                                    onChange={(e) => {
                                      const next = rows.map((r, idx) =>
                                        idx === rIdx ? { ...r, [col]: e.target.value } : r
                                      );
                                      setValue(el.id, next);
                                    }}
                                    placeholder={col}
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-sky-600"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              if (el.type === 'textarea') {
                return (
                  <div key={el.id} className="md:col-span-2 space-y-1.5">
                    <label className="block text-sm font-medium text-slate-800">
                      {el.label}
                      {el.required ? <span className="text-red-600 ml-1">*</span> : null}
                    </label>
                    <textarea
                      rows={3}
                      disabled={!interactive}
                      value={typeof currentVal === 'string' ? currentVal : ''}
                      onChange={(e) => setValue(el.id, e.target.value)}
                      placeholder={el.placeholder || 'Escriba sus observaciones aquí...'}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 disabled:bg-slate-50"
                    />
                  </div>
                );
              }

              if (el.type === 'signature') {
                return (
                  <div key={el.id} className="md:col-span-1">
                    <SignaturePad
                      label={el.label}
                      value={typeof currentVal === 'string' ? currentVal : ''}
                      onChange={(dataUrl) => setValue(el.id, dataUrl)}
                    />
                  </div>
                );
              }

              if (el.type === 'button') {
                return (
                  <div key={el.id} className="flex items-end">
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => onButtonClick?.(el)}
                      className="min-h-[42px] px-4 py-2 text-sm font-medium bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap"
                    >
                      {el.label}
                    </button>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
