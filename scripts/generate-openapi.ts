import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { OpenAPIV3 as OpenAPI } from 'openapi-types';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import Zodios endpoints defined in the server
import { endpoints } from '../apps/server/src/validators';

// Config
const API_TITLE = 'Potluck API';
const API_VERSION = '0.1.0';
const API_BASE_URL = '/api/v1';

// Some endpoints are public and should not require auth
const PUBLIC_ENDPOINTS = new Set<string>([
  '/auth/login',
  '/auth/signup',
  '/billing/webhook/stripe',
  '/_internal/schema-id-param',
]);

function isZodVoid(schema: z.ZodTypeAny): boolean {
  // ZodVoid has _def.typeName === 'ZodVoid'
  // Duck-type: safe check by parsing undefined
  try {
    schema.parse(undefined);
    // But many schemas accept undefined via optional, so ensure instanceof-like check
  } catch {
    // not void
  }
  // best-effort check
  // @ts-expect-error private-ish field access; fallback if present
  return schema?._def?.typeName === 'ZodVoid';
}

function zodSchemaToOpenAPISchema(schema: z.ZodTypeAny): OpenAPI.SchemaObject {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });
  // zod-to-json-schema returns definitions at root when converting a standalone schema.
  // We only use the root schema here; components are inlined for simplicity.
  // @ts-expect-error zod-to-json-schema output typing
  return (jsonSchema?.definitions ? jsonSchema.schema : jsonSchema) as OpenAPI.SchemaObject;
}

function buildOpenApi(): OpenAPI.Document {
  const doc: OpenAPI.Document = {
    openapi: '3.0.3',
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: 'Auto-generated from Zod/Zodios endpoints.'
    },
    servers: [
      { url: API_BASE_URL }
    ],
    tags: [],
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  };

  for (const ep of endpoints) {
    const pathItem = (doc.paths[ep.path] ||= {} as OpenAPI.PathItemObject);

    const method = ep.method.toLowerCase() as keyof OpenAPI.PathItemObject;
    const operation: OpenAPI.OperationObject = {
      operationId: ep.alias || `${ep.method}_${ep.path.replace(/\W+/g, '_')}`,
      summary: ep.description?.split('\n')[0],
      description: ep.description,
      tags: [ep.path.split('/').filter(Boolean)[0] || 'root'],
      parameters: [],
      responses: {},
    };

    // Parameters and requestBody
    const parameters = ep.parameters ?? [];
    for (const p of parameters) {
      if (p.type === 'Body') continue;
      const param: OpenAPI.ParameterObject = {
        name: p.name,
        in: p.type.toLowerCase() as 'path' | 'query' | 'header' | 'cookie',
        required: p.type === 'Path',
        schema: zodSchemaToOpenAPISchema(p.schema),
      };
      operation.parameters!.push(param);
    }

    const bodyParam = parameters.find((p) => p.type === 'Body');
    if (bodyParam) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: zodSchemaToOpenAPISchema(bodyParam.schema),
          }
        }
      };
    }

    // Responses
    const successSchema = ep.response as z.ZodTypeAny;
    const isVoid = isZodVoid(successSchema);
    const successStatus = isVoid && ['delete'].includes(ep.method.toLowerCase()) ? '204' : '200';
    operation.responses![successStatus] = {
      description: isVoid ? 'No Content' : 'Success',
      ...(isVoid
        ? {}
        : {
            content: {
              'application/json': {
                schema: zodSchemaToOpenAPISchema(successSchema),
              }
            }
          })
    } as OpenAPI.ResponseObject;

    for (const err of ep.errors ?? []) {
      const status = String(err.status);
      const resp: OpenAPI.ResponseObject = {
        description: err.description || 'Error',
      };
      if (err.schema && !isZodVoid(err.schema as any)) {
        resp.content = {
          'application/json': {
            schema: zodSchemaToOpenAPISchema(err.schema as any),
          }
        };
      }
      operation.responses![status] = resp;
    }

    // Security: public endpoints opt-out
    if (PUBLIC_ENDPOINTS.has(ep.path)) {
      operation.security = [];
    }

    pathItem[method] = operation;
  }

  // Deduplicate tags
  const tagSet = new Set<string>();
  for (const [p, item] of Object.entries(doc.paths)) {
    for (const m of ['get','post','put','patch','delete','options','head','trace'] as const) {
      const op = (item as any)[m] as OpenAPI.OperationObject | undefined;
      if (op?.tags) op.tags.forEach((t) => tagSet.add(t));
    }
  }
  doc.tags = Array.from(tagSet).map((name) => ({ name }));

  return doc;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const openapi = buildOpenApi();
  const outDir = path.resolve(process.cwd(), 'docs');
  ensureDir(outDir);

  const jsonPath = path.join(outDir, 'openapi.json');
  const yamlPath = path.join(outDir, 'openapi.yaml');

  fs.writeFileSync(jsonPath, JSON.stringify(openapi, null, 2), 'utf8');
  fs.writeFileSync(yamlPath, yaml.dump(openapi, { noRefs: true }), 'utf8');

  console.log(`OpenAPI written to:\n - ${jsonPath}\n - ${yamlPath}`);
}

main();