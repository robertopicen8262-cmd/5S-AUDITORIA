import type {
  AnswerValue,
  AuditClassification,
  AuditSectionResult,
  EvaluationCriterion,
  PillarCode,
} from '../types/audit';

export interface StandardSectionDef {
  id: string;
  pillar: PillarCode;
  title: string;
  subtitle: string;
  questions: { id: string; question: string; description: string }[];
}

export const STANDARD_5S_SECTIONS: StandardSectionDef[] = [
  {
    id: 'seiri',
    pillar: 'SEIRI',
    title: 'Primera S: SEIRI (CLASIFICAR)',
    subtitle: 'Separar lo necesario de lo innecesario en el área operativa.',
    questions: [
      {
        id: 'seiri_1',
        question: '¿Hay objetos innecesarios?',
        description: 'Verificar ausencia de herramientas, piezas o materiales ajenos al proceso actual.',
      },
      {
        id: 'seiri_2',
        question: '¿Herramientas en buen estado?',
        description: 'Comprobar integridad física, calibración y operatividad segura de herramental.',
      },
      {
        id: 'seiri_3',
        question: '¿Material obsoleto retirado?',
        description: 'Confirmar retiro de lotes caducos, refacciones dañadas y papelería obsoleta.',
      },
    ],
  },
  {
    id: 'seiton',
    pillar: 'SEITON',
    title: 'Segunda S: SEITON (ORDENAR)',
    subtitle: 'Un lugar definido para cada elemento y cada elemento en su lugar.',
    questions: [
      {
        id: 'seiton_1',
        question: '¿Lugar definido para cada cosa?',
        description: 'Tableros de sombras, racks y delimitaciones respetados.',
      },
      {
        id: 'seiton_2',
        question: '¿Pasillos libres?',
        description: 'Rutas de tránsito, salidas de emergencia y accesos a extintores despejados.',
      },
      {
        id: 'seiton_3',
        question: '¿Etiquetas visibles?',
        description: 'Identificación legible en gavetas, contenedores, estantes y ubicaciones.',
      },
    ],
  },
  {
    id: 'seiso',
    pillar: 'SEISO',
    title: 'Tercera S: SEISO (LIMPIAR)',
    subtitle: 'Eliminar fuentes de suciedad, polvo, derrames y residuos.',
    questions: [
      {
        id: 'seiso_1',
        question: '¿Piso limpio?',
        description: 'Superficie libre de aceite, virutas, polvo acumulado o humedad.',
      },
      {
        id: 'seiso_2',
        question: '¿Máquinas limpias?',
        description: 'Equipos, guardas, tableros y superficies de trabajo limpios y sin fugas.',
      },
      {
        id: 'seiso_3',
        question: '¿Botes de basura vacíos?',
        description: 'Contenedores de residuos clasificados por debajo del 80% de su capacidad.',
      },
    ],
  },
  {
    id: 'seiketsu',
    pillar: 'SEIKETSU',
    title: 'Cuarta S: SEIKETSU (ESTANDARIZAR)',
    subtitle: 'Mantener el estado óptimo mediante estándares visuales y rutinas.',
    questions: [
      {
        id: 'seiketsu_1',
        question: '¿Hay estándares visibles?',
        description: 'Ayudas visuales, hojas de verificación y fotografías de estado ideal publicadas.',
      },
      {
        id: 'seiketsu_2',
        question: '¿Señalización clara?',
        description: 'Delimitación de seguridad, código de colores y advertencias visibles.',
      },
      {
        id: 'seiketsu_3',
        question: '¿Controles visuales actualizados?',
        description: 'Tableros Andon, indicadores de limpieza y registros diarios al día.',
      },
    ],
  },
  {
    id: 'shitsuke',
    pillar: 'SHITSUKE',
    title: 'Quinta S: SHITSUKE (DISCIPLINA)',
    subtitle: 'Sostener el cumplimiento continuo de normas, seguridad y hábitos.',
    questions: [
      {
        id: 'shitsuke_1',
        question: '¿Usan el EPP?',
        description: 'Personal portando equipo de protección personal completo y correcto.',
      },
      {
        id: 'shitsuke_2',
        question: '¿Siguen los procedimientos?',
        description: 'Ejecución apegada a instrucciones de trabajo y estándares operativos.',
      },
      {
        id: 'shitsuke_3',
        question: '¿Se realizan auditorías periódicas?',
        description: 'Evidencia de recorridos programados y cierre de acciones correctivas.',
      },
    ],
  },
];

export interface ScoreSummary {
  totalQuestions: number;
  answeredCount: number;
  compliantCount: number;
  nonCompliantCount: number;
  naCount: number;
  applicableCount: number;
  scorePercentage: number | null;
  classification: AuditClassification;
  statusMessage: string;
}

/**
 * Calcula la puntuación exacta 5S:
 * Puntuación = (Respuestas CUMPLE / Respuestas aplicables) * 100
 * Las respuestas N/A se excluyen del denominador.
 */
export function calculateAuditScore(sections: AuditSectionResult[]): ScoreSummary {
  let totalQuestions = 0;
  let answeredCount = 0;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let naCount = 0;

  for (const section of sections) {
    for (const q of section.questions) {
      totalQuestions += 1;
      if (q.answer !== null) {
        answeredCount += 1;
        if (q.answer === 'CUMPLE') {
          compliantCount += 1;
        } else if (q.answer === 'NO_CUMPLE') {
          nonCompliantCount += 1;
        } else if (q.answer === 'NA') {
          naCount += 1;
        }
      }
    }
  }

  const applicableCount = compliantCount + nonCompliantCount;

  if (applicableCount === 0) {
    return {
      totalQuestions,
      answeredCount,
      compliantCount,
      nonCompliantCount,
      naCount,
      applicableCount,
      scorePercentage: null,
      classification: 'NO CALCULABLE',
      statusMessage: 'No es posible calcular la puntuación porque no existen respuestas aplicables.',
    };
  }

  const rawScore = (compliantCount / applicableCount) * 100;
  const scorePercentage = Math.round(rawScore * 10) / 10;

  let classification: AuditClassification = 'NO CONFORME';
  let statusMessage = 'Requiere plan de acción correctiva inmediato (< 85%).';

  if (scorePercentage >= 95) {
    classification = 'CONFORME';
    statusMessage = 'Cumplimiento sobresaliente dentro del estándar 5S (95% a 100%).';
  } else if (scorePercentage >= 85) {
    classification = 'OBSERVACIÓN';
    statusMessage = 'Desempeño aceptable con hallazgos menores por atender (85% a < 95%).';
  }

  return {
    totalQuestions,
    answeredCount,
    compliantCount,
    nonCompliantCount,
    naCount,
    applicableCount,
    scorePercentage,
    classification,
    statusMessage,
  };
}

export function buildSectionsFromCriteria(customCriteria: EvaluationCriterion[]): AuditSectionResult[] {
  const activeCriteria = customCriteria.filter((c) => c.active);

  if (activeCriteria.length === 0) {
    return STANDARD_5S_SECTIONS.map((sec) => ({
      id: sec.id,
      pillar: sec.pillar,
      title: sec.title,
      questions: sec.questions.map((q) => ({
        id: q.id,
        question: q.question,
        answer: null as AnswerValue | null,
      })),
      observations: '',
    }));
  }

  const pillarOrder: { pillar: PillarCode; defaultTitle: string; id: string }[] = [
    { id: 'seiri', pillar: 'SEIRI', defaultTitle: 'Primera S: SEIRI (CLASIFICAR)' },
    { id: 'seiton', pillar: 'SEITON', defaultTitle: 'Segunda S: SEITON (ORDENAR)' },
    { id: 'seiso', pillar: 'SEISO', defaultTitle: 'Tercera S: SEISO (LIMPIAR)' },
    { id: 'seiketsu', pillar: 'SEIKETSU', defaultTitle: 'Cuarta S: SEIKETSU (ESTANDARIZAR)' },
    { id: 'shitsuke', pillar: 'SHITSUKE', defaultTitle: 'Quinta S: SHITSUKE (DISCIPLINA)' },
  ];

  return pillarOrder
    .map((meta) => {
      const items = activeCriteria
        .filter((c) => c.pillar === meta.pillar)
        .sort((a, b) => a.order - b.order);

      if (items.length === 0) {
        const fallback = STANDARD_5S_SECTIONS.find((s) => s.pillar === meta.pillar);
        return {
          id: meta.id,
          pillar: meta.pillar,
          title: meta.defaultTitle,
          questions: (fallback?.questions ?? []).map((q) => ({
            id: q.id,
            question: q.question,
            answer: null as AnswerValue | null,
          })),
          observations: '',
        };
      }

      return {
        id: meta.id,
        pillar: meta.pillar,
        title: items[0].pillarTitle || meta.defaultTitle,
        questions: items.map((c) => ({
          id: c.id,
          question: c.question,
          answer: null as AnswerValue | null,
        })),
        observations: '',
      };
    });
}
