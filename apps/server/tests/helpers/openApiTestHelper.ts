import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { OpenAPIV3 } from 'openapi-types';
import { faker }                  from '@faker-js/faker';
import openapiSampler, { Options as SamplerOpts } from 'openapi-sampler';

interface SamplerOptsFixed extends SamplerOpts {
  useExamplesValue?: boolean;
  useDefaultValue?: boolean;
}

const opts: SamplerOptsFixed = {
  skipReadOnly:    true,
  skipNonRequired: false,
  useExamplesValue: true,
  useDefaultValue:  true
};


export class OpenApiTestHelper {
public apiSpec: OpenAPIV3.Document; // same as OpenAPIObject

  constructor(apiSpecPath: string) {
    const fileContent = fs.readFileSync(path.resolve(apiSpecPath), 'utf-8');
    this.apiSpec = yaml.load(fileContent) as OpenAPIV3.Document;
  }

  

  /**
   * Get the requestBody schema for a specific path and method
   */
  getRequestSchema(pathStr: string, method: string): object | undefined {
    const pathItem = this.apiSpec.paths?.[pathStr];
    if (!pathItem) return undefined;

    const operation = (pathItem as any)[method.toLowerCase()] as OpenAPIV3.OperationObject;
    if (!operation || !operation.requestBody) return undefined;

    // OpenAPI 3.0+
    const requestBody: any = operation.requestBody;
    const content = requestBody.content || {};
    const json = content['application/json'];
    if (json && json.schema) {
      return json.schema;
    }
    return undefined;
  }

  /**
   * Get the response schema for a specific path, method, and status code
   */
  getResponseSchema(pathStr: string, method: string, status: string = '200'): object | undefined {
    const pathItem = this.apiSpec.paths?.[pathStr];
    if (!pathItem) return undefined;

    const operation = (pathItem as any)[method.toLowerCase()] as OpenAPIV3.OperationObject;
    if (!operation || !operation.responses) return undefined;

    const response = operation.responses[status];
    if (!response) return undefined;

    const content = (response as any).content || {};
    const json = content['application/json'];
    if (json && json.schema) {
      return json.schema;
    }
    return undefined;
  }

  /**
   * Generate a sample data object based on a schema (using openapi-sampler)
   */
/* ---------- NEW: smarter sample ---------- */
  static generateSample(
    schema: object,
    spec: OpenAPIV3.Document
  ): any {
    // 1️⃣  Let openapi-sampler build the correct shape
  const raw = openapiSampler.sample(schema, opts, spec);
    // 2️⃣  Traverse and beautify via faker
    return OpenApiTestHelper.enrichWithFaker(raw, schema);
  }

  /** Recursively walk the object & replace bland placeholders */
  private static enrichWithFaker(value: any, schema: any): any {
    if (value === null || value === undefined) return value;

    /* ---------- ENUM ---------- */
    if (schema && Array.isArray(schema.enum)) {
      if (typeof value === 'string' && schema.enum.includes(value)) return value;
      return faker.helpers.arrayElement(schema.enum as string[]);
    }

    /* ---------- STRINGS ---------- */
    if (typeof value === 'string') {
      // If the schema says it's a date, ALWAYS make a valid ISO string
      if (/date-time|date/i.test(schema?.format)) {
        return faker.date.future().toISOString();
      }

      // Replace only generic placeholder words; keep realistic sampler output
      if (value !== 'string') return value;

      const name = schema?.format || schema?.title || '';

      if (/uuid|id/i.test(name))          return faker.string.uuid();
      if (/email/i.test(name))            return faker.internet.email();
      if (/name/i.test(name))             return faker.person.fullName();
      if (/title/i.test(name))            return faker.lorem.words(3);
      if (/description/i.test(name))      return faker.lorem.sentence();
      if (/address/i.test(name))          return faker.location.streetAddress();

      return faker.lorem.word();
    }

    /* ---------- NUMBERS ---------- */
    if (typeof value === 'number') {
      if (value !== 0) return value; // sampler already chose something
      const min = schema?.minimum ?? 0;
      const max = schema?.maximum ?? min + 10;
      const multiple = schema?.multipleOf ?? 1;
      const n = faker.number.float({ min, max, multipleOf: multiple });
      return schema?.type === 'integer' ? Math.round(n) : n;
    }

    /* ---------- OBJECTS (convert numeric-key maps → arrays first) ---------- */
    if (typeof value === 'object') {
      // Detect pattern { "0": {...}, "1": {...} }
      const allNumericKeys = Object.keys(value).every(k => /^\d+$/.test(k));
      if (allNumericKeys) {
        // Recurse as array
        const asArray = Object.values(value).map(v =>
          OpenApiTestHelper.enrichWithFaker(v, schema?.items ?? {})
        );
        return asArray;
      }

      // Regular object: recurse per property
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        const propSchema = schema?.properties?.[k] ?? {};
        out[k] = OpenApiTestHelper.enrichWithFaker(v, propSchema);
      }
      return out;
    }

    /* ---------- ARRAY (shouldn’t reach here if object-case handled) ---------- */
    if (Array.isArray(value) && schema?.items) {
      return value.map(v => OpenApiTestHelper.enrichWithFaker(v, schema.items));
    }

    return value; // booleans etc.
  }



  /* ---------- convenience wrappers ---------- */
  getSamplePostPayload(pathStr: string): any {
    const schema = this.getRequestSchema(pathStr, 'post');
    return schema ? OpenApiTestHelper.generateSample(schema, this.apiSpec) : undefined;
  }

  getSampleGetResponse(pathStr: string, status = '200'): any {
    const schema = this.getResponseSchema(pathStr, 'get', status);
    return schema ? OpenApiTestHelper.generateSample(schema, this.apiSpec) : undefined;
  }
}
