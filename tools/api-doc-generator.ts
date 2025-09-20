import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

interface RouteInfo {
  method: string;
  path: string;
  file: string;
  handler?: string;
  controller?: string;
  service_calls?: string[];
  description?: string;
  parameters?: any[];
  responses?: any[];
  examples?: any[];
}

(async () => {
  console.log('📚 Generating enhanced API documentation...');
  
  // Read the routes index
  const routesData = JSON.parse(readFileSync('.agent/routes.index.json', 'utf8'));
  const routes: RouteInfo[] = routesData.server.routes;
  
  // Read the OpenAPI spec for additional context (skip for now)
  // const openApiSpec = JSON.parse(readFileSync('docs/api-spec.yaml', 'utf8'));
  
  // Generate enhanced API documentation
  const apiDoc = {
    generated_at: new Date().toISOString(),
    version: "1.0",
    base_url: "https://api.potluck.app/api/v1",
    endpoints: routes.map(route => ({
      ...route,
      description: generateDescription(route),
      parameters: extractParameters(route),
      responses: extractResponses(route),
      examples: generateExamples(route),
      security: extractSecurity(route),
      rate_limits: extractRateLimits(route)
    })),
    categories: categorizeEndpoints(routes),
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>",
      endpoints: routes.filter(r => r.path.includes('auth') || r.path.includes('login'))
    },
    error_codes: {
      "400": "Bad Request - Invalid input",
      "401": "Unauthorized - Invalid or missing token",
      "403": "Forbidden - Insufficient permissions",
      "404": "Not Found - Resource not found",
      "500": "Internal Server Error - Server error"
    }
  };
  
  mkdirSync('.agent', { recursive: true });
  writeFileSync('.agent/api-documentation.json', JSON.stringify(apiDoc, null, 2));
  
  // Generate human-readable API guide
  const humanReadable = generateHumanReadableAPI(apiDoc);
  writeFileSync('.agent/API_GUIDE.md', humanReadable);
  
  console.log('✅ API documentation generated!');
  console.log(`📊 Documented ${routes.length} endpoints`);
  console.log(`📁 Generated .agent/api-documentation.json`);
  console.log(`📁 Generated .agent/API_GUIDE.md`);
})();

function generateDescription(route: RouteInfo): string {
  const pathParts = route.path.split('/');
  const resource = pathParts[pathParts.length - 1];
  
  switch (route.method) {
    case 'GET':
      return `Retrieve ${resource} data`;
    case 'POST':
      return `Create new ${resource}`;
    case 'PUT':
      return `Update existing ${resource}`;
    case 'DELETE':
      return `Delete ${resource}`;
    default:
      return `Handle ${resource} operations`;
  }
}

function extractParameters(route: RouteInfo): any[] {
  const params: any[] = [];
  
  // Extract path parameters
  const pathParams = route.path.match(/:(\w+)/g);
  if (pathParams) {
    pathParams.forEach(param => {
      params.push({
        name: param.substring(1),
        in: 'path',
        required: true,
        type: 'string',
        description: `The ${param.substring(1)} identifier`
      });
    });
  }
  
  // Extract query parameters (simplified)
  if (route.path.includes('?')) {
    const queryPart = route.path.split('?')[1];
    const queryParams = queryPart.split('&');
    queryParams.forEach(param => {
      const [name, value] = param.split('=');
      params.push({
        name,
        in: 'query',
        required: false,
        type: 'string',
        description: `Query parameter: ${name}`
      });
    });
  }
  
  return params;
}

function extractResponses(route: RouteInfo): any[] {
  const responses = [
    {
      code: 200,
      description: "Success",
      example: generateSuccessExample(route)
    }
  ];
  
  if (route.method === 'POST' || route.method === 'PUT') {
    responses.push({
      code: 201,
      description: "Created/Updated",
      example: generateSuccessExample(route)
    });
  }
  
  responses.push(
    {
      code: 400,
      description: "Bad Request",
      example: { error: "Invalid input data" }
    },
    {
      code: 401,
      description: "Unauthorized",
      example: { error: "Invalid or missing authentication token" }
    },
    {
      code: 500,
      description: "Internal Server Error",
      example: { error: "An unexpected error occurred" }
    }
  );
  
  return responses;
}

function generateExamples(route: RouteInfo): any[] {
  const examples = [];
  
  // Request example
  if (route.method === 'POST' || route.method === 'PUT') {
    examples.push({
      type: 'request',
      description: `Example ${route.method} request`,
      data: generateRequestExample(route)
    });
  }
  
  // Response example
  examples.push({
    type: 'response',
    description: 'Example response',
    data: generateSuccessExample(route)
  });
  
  return examples;
}

function generateRequestExample(route: RouteInfo): any {
  const pathParts = route.path.split('/');
  const resource = pathParts[pathParts.length - 1];
  
  switch (resource) {
    case 'events':
      return {
        title: "Sample Event",
        description: "A sample potluck event",
        date: "2025-12-25T18:00:00Z",
        location: "123 Main St, City, State"
      };
    case 'users':
      return {
        name: "John Doe",
        email: "john@example.com",
        preferences: ["vegetarian", "gluten-free"]
      };
    default:
      return { data: "Sample data" };
  }
}

function generateSuccessExample(route: RouteInfo): any {
  const pathParts = route.path.split('/');
  const resource = pathParts[pathParts.length - 1];
  
  switch (resource) {
    case 'events':
      return {
        id: "evt_123",
        title: "Sample Event",
        description: "A sample potluck event",
        date: "2025-12-25T18:00:00Z",
        location: "123 Main St, City, State",
        created_at: "2025-09-20T10:00:00Z"
      };
    case 'users':
      return {
        id: "user_123",
        name: "John Doe",
        email: "john@example.com",
        created_at: "2025-09-20T10:00:00Z"
      };
    default:
      return { success: true, data: "Operation completed successfully" };
  }
}

function extractSecurity(route: RouteInfo): string[] {
  const publicEndpoints = ['/health', '/auth/login', '/auth/register'];
  const isPublic = publicEndpoints.some(endpoint => route.path.includes(endpoint));
  
  return isPublic ? [] : ['Bearer Token'];
}

function extractRateLimits(route: RouteInfo): any {
  const authEndpoints = ['/auth/login', '/auth/register'];
  const isAuth = authEndpoints.some(endpoint => route.path.includes(endpoint));
  
  return {
    requests_per_minute: isAuth ? 5 : 100,
    burst_limit: isAuth ? 10 : 200
  };
}

function categorizeEndpoints(routes: RouteInfo[]): any {
  const categories: any = {};
  
  routes.forEach(route => {
    const pathParts = route.path.split('/');
    const category = pathParts[2] || 'general';
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push({
      method: route.method,
      path: route.path,
      description: generateDescription(route)
    });
  });
  
  return categories;
}

function generateHumanReadableAPI(apiDoc: any): string {
  let markdown = `# API Documentation\n\n`;
  markdown += `Generated: ${apiDoc.generated_at}\n\n`;
  markdown += `Base URL: ${apiDoc.base_url}\n\n`;
  
  markdown += `## Authentication\n\n`;
  markdown += `All endpoints require Bearer token authentication:\n`;
  markdown += `\`\`\`\n`;
  markdown += `Authorization: Bearer <your-token>\n`;
  markdown += `\`\`\`\n\n`;
  
  markdown += `## Endpoints by Category\n\n`;
  
  Object.entries(apiDoc.categories).forEach(([category, endpoints]: [string, any]) => {
    markdown += `### ${category.toUpperCase()}\n\n`;
    
    endpoints.forEach((endpoint: any) => {
      markdown += `#### ${endpoint.method} ${endpoint.path}\n`;
      markdown += `${endpoint.description}\n\n`;
    });
  });
  
  markdown += `## Error Codes\n\n`;
  markdown += `| Code | Description |\n`;
  markdown += `|------|-------------|\n`;
  
  Object.entries(apiDoc.error_codes).forEach(([code, description]) => {
    markdown += `| ${code} | ${description} |\n`;
  });
  
  return markdown;
}
