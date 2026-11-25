export type NavSection = 'inicio' | 'disenador' | 'auditorias' | 'historial' | 'administracion';

export type PillarCode = 'SEIRI' | 'SEITON' | 'SEISO' | 'SEIKETSU' | 'SHITSUKE';

export type AnswerValue = 'CUMPLE' | 'NO_CUMPLE' | 'NA';

export type AuditClassification = 'CONFORME' | 'OBSERVACIÓN' | 'NO CONFORME' | 'NO CALCULABLE';

export type ShiftType = 'Matutino' | 'Vespertino' | 'Nocturno' | 'Mixto';

export type FormElementType =
  | 'header'
  | 'text'
  | 'select'
  | 'button'
  | 'checkbox'
  | 'radio'
  | 'table'
  | 'textarea'
  | 'signature';

export interface TemplateElement {
  id: string;
  type: FormElementType;
  label: string;
  required: boolean;
  placeholder: string;
  options: string[];
  columns: string[];
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  elements: TemplateElement[];
}

export interface SketchAnalysisResult {
  formTitle: string;
  formDescription: string;
  sections: TemplateSection[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'auditor';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkArea {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  description: string;
  supervisor: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkStation {
  id: string;
  ownerId: string;
  areaId: string;
  areaName: string;
  name: string;
  code: string;
  line: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EvaluationCriterion {
  id: string;
  ownerId: string;
  pillar: PillarCode;
  pillarTitle: string;
  question: string;
  description: string;
  order: number;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditTemplate {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  sourceImageName: string;
  sourceImageUrl: string;
  schemaVersion: string;
  sections: TemplateSection[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditQuestionResult {
  id: string;
  question: string;
  answer: AnswerValue | null;
}

export interface AuditSectionResult {
  id: string;
  pillar: string;
  title: string;
  questions: AuditQuestionResult[];
  observations: string;
}

export interface AuditRecord {
  id: string;
  ownerId: string;
  templateId: string;
  templateName: string;
  areaId: string;
  areaName: string;
  stationId: string;
  stationName: string;
  auditorName: string;
  responsibleName: string;
  auditDate: string;
  shift: ShiftType;
  sections: AuditSectionResult[];
  totalQuestions: number;
  applicableCount: number;
  compliantCount: number;
  nonCompliantCount: number;
  naCount: number;
  scorePercentage: number | null;
  classification: AuditClassification;
  generalObservations: string;
  auditorSignature: string;
  responsibleSignature: string;
  status: 'completed';
  createdAt?: unknown;
}
