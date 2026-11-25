import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  db,
  handleFirestoreError,
  isUserAdmin,
  OperationType,
  storage,
} from '../firebase';
import type {
  AuditRecord,
  AuditTemplate,
  EvaluationCriterion,
  PillarCode,
  TemplateSection,
  WorkArea,
  WorkStation,
} from '../types/audit';
import { STANDARD_5S_SECTIONS } from '../utils/scoring';

function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function clampStr(value: string | undefined | null, maxLen: number): string {
  return (value ?? '').trim().slice(0, maxLen);
}

function buildOwnerScopedQuery(collectionName: string, user: User) {
  const colRef = collection(db, collectionName);
  if (isUserAdmin(user)) {
    return query(colRef);
  }
  return query(colRef, where('ownerId', '==', user.uid));
}

function getTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    const fn = (ts as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(ts);
  }
  return 0;
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const role = isUserAdmin(user) ? 'admin' : 'auditor';

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: clampStr(user.displayName || user.email?.split('@')[0] || 'Auditor 5S', 120),
        email: clampStr(user.email || '', 180),
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: clampStr(user.displayName || snap.data().displayName || 'Auditor 5S', 120),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// ÁREAS DE TRABAJO
// ==========================================
export function subscribeAreas(
  user: User,
  onData: (areas: WorkArea[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'areas';
  const q = buildOwnerScopedQuery(path, user);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: WorkArea[] = snapshot.docs
        .map((d) => d.data() as WorkArea)
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createArea(
  user: User,
  input: { name: string; code: string; description: string; supervisor: string; active: boolean }
): Promise<WorkArea> {
  const id = generateSafeId('area');
  const path = `areas/${id}`;
  const payload = {
    id,
    ownerId: user.uid,
    name: clampStr(input.name, 120),
    code: clampStr(input.code, 40),
    description: clampStr(input.description, 500),
    supervisor: clampStr(input.supervisor, 120),
    active: Boolean(input.active),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'areas', id), payload);
    return payload as WorkArea;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateArea(
  id: string,
  input: { name: string; code: string; description: string; supervisor: string; active: boolean }
): Promise<void> {
  const path = `areas/${id}`;
  try {
    await updateDoc(doc(db, 'areas', id), {
      name: clampStr(input.name, 120),
      code: clampStr(input.code, 40),
      description: clampStr(input.description, 500),
      supervisor: clampStr(input.supervisor, 120),
      active: Boolean(input.active),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteArea(id: string): Promise<void> {
  const path = `areas/${id}`;
  try {
    await deleteDoc(doc(db, 'areas', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// ESTACIONES
// ==========================================
export function subscribeStations(
  user: User,
  onData: (stations: WorkStation[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'stations';
  const q = buildOwnerScopedQuery(path, user);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: WorkStation[] = snapshot.docs
        .map((d) => d.data() as WorkStation)
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createStation(
  user: User,
  input: {
    areaId: string;
    areaName: string;
    name: string;
    code: string;
    line: string;
    active: boolean;
  }
): Promise<WorkStation> {
  const id = generateSafeId('est');
  const path = `stations/${id}`;
  const payload = {
    id,
    ownerId: user.uid,
    areaId: clampStr(input.areaId, 128),
    areaName: clampStr(input.areaName, 120),
    name: clampStr(input.name, 120),
    code: clampStr(input.code, 40),
    line: clampStr(input.line, 80),
    active: Boolean(input.active),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'stations', id), payload);
    return payload as WorkStation;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStation(
  id: string,
  input: {
    areaId: string;
    areaName: string;
    name: string;
    code: string;
    line: string;
    active: boolean;
  }
): Promise<void> {
  const path = `stations/${id}`;
  try {
    await updateDoc(doc(db, 'stations', id), {
      areaId: clampStr(input.areaId, 128),
      areaName: clampStr(input.areaName, 120),
      name: clampStr(input.name, 120),
      code: clampStr(input.code, 40),
      line: clampStr(input.line, 80),
      active: Boolean(input.active),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStation(id: string): Promise<void> {
  const path = `stations/${id}`;
  try {
    await deleteDoc(doc(db, 'stations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// CRITERIOS DE EVALUACIÓN 5S
// ==========================================
export function subscribeCriteria(
  user: User,
  onData: (criteria: EvaluationCriterion[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'criteria';
  const q = buildOwnerScopedQuery(path, user);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: EvaluationCriterion[] = snapshot.docs.map((d) => d.data() as EvaluationCriterion);
      onData(items.sort((a, b) => a.order - b.order));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createCriterion(
  user: User,
  input: {
    pillar: PillarCode;
    pillarTitle: string;
    question: string;
    description: string;
    order: number;
    active: boolean;
  }
): Promise<EvaluationCriterion> {
  const id = generateSafeId('crit');
  const path = `criteria/${id}`;
  const payload = {
    id,
    ownerId: user.uid,
    pillar: input.pillar,
    pillarTitle: clampStr(input.pillarTitle, 80),
    question: clampStr(input.question, 300),
    description: clampStr(input.description, 500),
    order: Math.max(0, Math.min(500, Math.round(input.order))),
    active: Boolean(input.active),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'criteria', id), payload);
    return payload as EvaluationCriterion;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCriterion(
  id: string,
  input: {
    pillar: PillarCode;
    pillarTitle: string;
    question: string;
    description: string;
    order: number;
    active: boolean;
  }
): Promise<void> {
  const path = `criteria/${id}`;
  try {
    await updateDoc(doc(db, 'criteria', id), {
      pillar: input.pillar,
      pillarTitle: clampStr(input.pillarTitle, 80),
      question: clampStr(input.question, 300),
      description: clampStr(input.description, 500),
      order: Math.max(0, Math.min(500, Math.round(input.order))),
      active: Boolean(input.active),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCriterion(id: string): Promise<void> {
  const path = `criteria/${id}`;
  try {
    await deleteDoc(doc(db, 'criteria', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStandardCriteriaCatalog(user: User): Promise<void> {
  const path = 'criteria';
  try {
    const batch = writeBatch(db);
    let orderIdx = 1;
    for (const sec of STANDARD_5S_SECTIONS) {
      for (const q of sec.questions) {
        const id = generateSafeId(`crit_${sec.pillar.toLowerCase()}`);
        batch.set(doc(db, 'criteria', id), {
          id,
          ownerId: user.uid,
          pillar: sec.pillar,
          pillarTitle: clampStr(sec.title, 80),
          question: clampStr(q.question, 300),
          description: clampStr(q.description, 500),
          order: orderIdx,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        orderIdx += 1;
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// FIREBASE STORAGE + PLANTILLAS DE AUDITORÍA
// ==========================================
export async function uploadSketchToStorage(
  user: User,
  file: File,
  templateId: string
): Promise<string> {
  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const storageRef = ref(storage, `sketches/${user.uid}/${templateId}_${cleanName}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    return clampStr(url, 2000);
  } catch (err) {
    console.warn('No se pudo cargar la imagen a Firebase Storage; se guardará la plantilla en Firestore:', err);
    return '';
  }
}

export function subscribeTemplates(
  user: User,
  onData: (templates: AuditTemplate[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'templates';
  const q = buildOwnerScopedQuery(path, user);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditTemplate[] = snapshot.docs
        .map((d) => d.data() as AuditTemplate)
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createTemplate(
  user: User,
  input: {
    name: string;
    description: string;
    sourceImageName: string;
    sourceFile?: File | null;
    sections: TemplateSection[];
    active: boolean;
  }
): Promise<AuditTemplate> {
  const id = generateSafeId('tpl');
  const path = `templates/${id}`;

  let sourceImageUrl = '';
  if (input.sourceFile) {
    sourceImageUrl = await uploadSketchToStorage(user, input.sourceFile, id);
  }

  const sanitizedSections = input.sections.slice(0, 30).map((sec, sIdx) => ({
    id: clampStr(sec.id || `sec_${sIdx + 1}`, 80),
    title: clampStr(sec.title || `Sección ${sIdx + 1}`, 160),
    description: clampStr(sec.description || '', 400),
    elements: (sec.elements || []).slice(0, 60).map((el, eIdx) => ({
      id: clampStr(el.id || `el_${sIdx + 1}_${eIdx + 1}`, 80),
      type: el.type,
      label: clampStr(el.label || 'Elemento', 200),
      required: Boolean(el.required),
      placeholder: clampStr(el.placeholder || '', 200),
      options: (el.options || []).slice(0, 30).map((o) => clampStr(o, 120)),
      columns: (el.columns || []).slice(0, 20).map((c) => clampStr(c, 120)),
    })),
  }));

  const payload = {
    id,
    ownerId: user.uid,
    name: clampStr(input.name, 160),
    description: clampStr(input.description, 600),
    sourceImageName: clampStr(input.sourceImageName, 200),
    sourceImageUrl: clampStr(sourceImageUrl, 2000),
    schemaVersion: '1.0',
    sections: sanitizedSections,
    active: Boolean(input.active),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'templates', id), payload);
    return payload as AuditTemplate;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTemplate(
  id: string,
  input: {
    name: string;
    description: string;
    sections: TemplateSection[];
    active: boolean;
  }
): Promise<void> {
  const path = `templates/${id}`;
  try {
    await updateDoc(doc(db, 'templates', id), {
      name: clampStr(input.name, 160),
      description: clampStr(input.description, 600),
      sections: input.sections.slice(0, 30),
      active: Boolean(input.active),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  const path = `templates/${id}`;
  try {
    await deleteDoc(doc(db, 'templates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// AUDITORÍAS 5S
// ==========================================
export function subscribeAudits(
  user: User,
  onData: (audits: AuditRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'audits';
  const q = buildOwnerScopedQuery(path, user);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditRecord[] = snapshot.docs
        .map((d) => d.data() as AuditRecord)
        .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function createAudit(
  user: User,
  input: Omit<AuditRecord, 'id' | 'ownerId' | 'status' | 'createdAt'>
): Promise<AuditRecord> {
  const id = generateSafeId('aud');
  const path = `audits/${id}`;

  const payload = {
    id,
    ownerId: user.uid,
    templateId: clampStr(input.templateId || 'standard_5s', 128),
    templateName: clampStr(input.templateName || 'Auditoría Estándar 5S', 160),
    areaId: clampStr(input.areaId, 128),
    areaName: clampStr(input.areaName, 120),
    stationId: clampStr(input.stationId, 128),
    stationName: clampStr(input.stationName, 120),
    auditorName: clampStr(input.auditorName, 120),
    responsibleName: clampStr(input.responsibleName, 120),
    auditDate: clampStr(input.auditDate, 30),
    shift: input.shift,
    sections: input.sections.slice(0, 30).map((sec) => ({
      id: clampStr(sec.id, 80),
      pillar: clampStr(sec.pillar, 40),
      title: clampStr(sec.title, 160),
      questions: sec.questions.map((q) => ({
        id: clampStr(q.id, 80),
        question: clampStr(q.question, 300),
        answer: q.answer,
      })),
      observations: clampStr(sec.observations, 1000),
    })),
    totalQuestions: input.totalQuestions,
    applicableCount: input.applicableCount,
    compliantCount: input.compliantCount,
    nonCompliantCount: input.nonCompliantCount,
    naCount: input.naCount,
    scorePercentage: input.scorePercentage,
    classification: input.classification,
    generalObservations: clampStr(input.generalObservations, 1500),
    auditorSignature: clampStr(input.auditorSignature, 200000),
    responsibleSignature: clampStr(input.responsibleSignature, 200000),
    status: 'completed' as const,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'audits', id), payload);
    return payload as AuditRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
