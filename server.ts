import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const ElementTypeSchema = z.enum([
  'header',
  'text',
  'select',
  'button',
  'checkbox',
  'radio',
  'table',
  'textarea',
  'signature',
]);

const TemplateElementSchema = z.object({
  id: z.string().min(1).max(80),
  type: ElementTypeSchema,
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).default(''),
  options: z.array(z.string().max(120)).max(30).default([]),
  columns: z.array(z.string().max(120)).max(20).default([]),
});

const TemplateSectionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  description: z.string().max(400).default(''),
  elements: z.array(TemplateElementSchema).min(1).max(60),
});

const SketchAnalysisSchema = z.object({
  formTitle: z.string().min(1).max(160),
  formDescription: z.string().max(500).default(''),
  sections: z.array(TemplateSectionSchema).min(1).max(30),
});

const AnalyzeRequestSchema = z.object({
  imageBase64: z.string().min(20).max(15_000_000),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  templateHint: z.string().max(300).optional(),
});

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeId(raw: string, fallbackPrefix: string, index: number): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}_${index + 1}`;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '16mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sistema-auditoria-5s' });
  });

  app.post('/api/ai/analyze-sketch', async (req, res) => {
    const parsedReq = AnalyzeRequestSchema.safeParse(req.body);
    if (!parsedReq.success) {
      res.status(400).json({
        error: 'Datos de imagen inválidos. Se requiere una imagen PNG o JPG válida.',
        details: parsedReq.error.flatten(),
      });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'La clave GEMINI_API_KEY no está configurada en el servidor. Configúrala en el panel de secretos para habilitar el análisis multimodal.',
      });
      return;
    }

    const { imageBase64, mimeType, templateHint } = parsedReq.data;
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const systemInstruction = [
      'Eres un experto en ingeniería industrial, Lean Manufacturing, auditorías 5S y digitalización de formularios.',
      'Analiza cuidadosamente la imagen proporcionada (boceto a mano, diagrama, captura o formato impreso de formulario industrial).',
      'Identifica TODOS los elementos presentes en el diseño y organízalos en secciones lógicas en español:',
      '- Encabezados (type: "header")',
      '- Campos de texto o datos generales (type: "text")',
      '- Listas desplegables (type: "select", incluyendo sus opciones)',
      '- Botones de acción (type: "button")',
      '- Casillas de verificación múltiples (type: "checkbox", incluyendo opciones)',
      '- Botones de opción / preguntas de selección única como Cumple / No cumple / N/A (type: "radio", incluyendo opciones)',
      '- Tablas de inspección o matrices de verificación (type: "table", incluyendo los títulos de columnas)',
      '- Áreas de observaciones o comentarios largos (type: "textarea")',
      '- Espacios de firma (type: "signature")',
      'Responde únicamente con JSON estructurado válido conforme al esquema solicitado. Usa etiquetas claras en español.',
    ].join('\n');

    const promptText = templateHint
      ? `Analiza este boceto o formulario industrial y extrae su estructura completa en JSON. Contexto adicional del usuario: ${templateHint}`
      : 'Analiza este boceto o formulario industrial y extrae todas sus secciones, campos, preguntas, tablas, áreas de observaciones, botones y firmas en formato JSON estructurado.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              formTitle: {
                type: Type.STRING,
                description: 'Título principal identificado del formulario.',
              },
              formDescription: {
                type: Type.STRING,
                description: 'Breve descripción del propósito del formulario.',
              },
              sections: {
                type: Type.ARRAY,
                description: 'Secciones ordenadas del formulario identificado.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    elements: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: {
                            type: Type.STRING,
                            description:
                              'Debe ser uno de: header, text, select, button, checkbox, radio, table, textarea, signature',
                          },
                          label: { type: Type.STRING },
                          required: { type: Type.BOOLEAN },
                          placeholder: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          columns: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                        required: ['id', 'type', 'label', 'required', 'placeholder', 'options', 'columns'],
                      },
                    },
                  },
                  required: ['id', 'title', 'description', 'elements'],
                },
              },
            },
            required: ['formTitle', 'formDescription', 'sections'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini API no devolvió contenido estructurado al analizar la imagen.',
        });
        return;
      }

      const rawJson = JSON.parse(rawText);
      const validated = SketchAnalysisSchema.safeParse(rawJson);
      if (!validated.success) {
        res.status(422).json({
          error: 'La respuesta JSON generada no cumplió con el esquema de plantilla validado.',
          details: validated.error.flatten(),
        });
        return;
      }

      // Normalize IDs to safe identifiers
      const normalized = {
        formTitle: validated.data.formTitle.trim(),
        formDescription: validated.data.formDescription.trim(),
        sections: validated.data.sections.map((sec, sIdx) => ({
          id: sanitizeId(sec.id, 'sec', sIdx),
          title: sec.title.trim(),
          description: sec.description.trim(),
          elements: sec.elements.map((el, eIdx) => ({
            id: sanitizeId(el.id, `el_${sIdx + 1}`, eIdx),
            type: el.type,
            label: el.label.trim(),
            required: Boolean(el.required),
            placeholder: el.placeholder.trim(),
            options: el.options.map((o) => o.trim()).filter(Boolean),
            columns: el.columns.map((c) => c.trim()).filter(Boolean),
          })),
        })),
      };

      res.json({ analysis: normalized });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error en /api/ai/analyze-sketch:', message);

      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
        res.status(403).json({
          error: 'La clave de Gemini API no es válida o no tiene permisos. Verifica Settings > Secrets.',
        });
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error: 'Se alcanzó el límite temporal de solicitudes a Gemini API. Intenta nuevamente en unos momentos.',
        });
        return;
      }

      res.status(500).json({
        error: `No fue posible analizar el boceto con Gemini API: ${message}`,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Aplicación compilada no encontrada.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Sistema Inteligente de Auditoría 5S ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
