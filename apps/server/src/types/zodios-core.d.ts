declare module '@zodios/core' {
  export type ZodiosEndpoint = { method: string; path: string };
  export function makeApi(endpoints: ZodiosEndpoint[]): unknown;
  export class Zodios { constructor(baseUrl: string, api: unknown, options?: unknown); }
  export type ZodiosOptions = { headers?: Record<string, string> } | undefined;
}


