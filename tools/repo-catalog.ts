import { Project, SyntaxKind, CallExpression, SourceFile } from 'ts-morph';
import fg from 'fast-glob';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';
import { createHash } from 'crypto';

const ROOTS = [
  'apps/server/src',      // backend
  'apps/mobile/src',      // RN app
  'packages/payments/src' // payments package
];
const OUT_DIR = '.agent';

type RouteEntry = {
  method: string; 
  path: string; 
  file: string;
  handler?: string; 
  controller?: string; 
  service_calls?: string[];
};

type FileInfo = {
  path: string;
  kind: string;
  lines: number;
  exports: string[];
  imports: string[];
  env: string[];
  hash: string;
};

type Catalog = {
  generated_at: string;
  roots: string[];
  files: FileInfo[];
};

(async () => {
  console.log('🔍 Building repo catalog...');
  
  mkdirSync(OUT_DIR, { recursive: true });
  const project = new Project({
    tsConfigFilePath: resolve('tsconfig.json'),
    skipAddingFilesFromTsConfig: false
  });

  // Add extra files not covered by tsconfig (e.g., tests)
  const extra = await fg(['**/*.{ts,tsx,js,jsx}', '!node_modules/**', '!dist/**', '!coverage/**', '!test-results/**']);
  extra.forEach(f => { 
    if (!project.getSourceFile(f)) {
      project.addSourceFileAtPathIfExists(f); 
    }
  });

  const files = project.getSourceFiles().filter(sf => {
    const filePath = sf.getFilePath();
    return ROOTS.some(root => filePath.includes(root)) ||
           filePath.includes('tests/') ||
           filePath.includes('__tests__/');
  });

  console.log(`📁 Found ${files.length} files to catalog`);

  // --- Build repo.catalog.json
  const catalog: Catalog = {
    generated_at: new Date().toISOString(),
    roots: ROOTS,
    files: files.map(sf => {
      const filePath = relative(process.cwd(), sf.getFilePath()).replace(/\\/g, '/');
      const content = sf.getFullText();
      const hash = createHash('sha256').update(content).digest('hex');
      
      // Extract environment variable usage
      const envVars = new Set<string>();
      sf.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
        .forEach(pa => {
          if (pa.getExpression().getText() === 'process' && pa.getName() === 'env') {
            const parent = pa.getParentIfKind(SyntaxKind.PropertyAccessExpression);
            if (parent) {
              envVars.add(parent.getName());
            }
          }
        });

      const info: FileInfo = {
        path: filePath,
        kind: filePath.endsWith('.tsx') ? 'tsx' : filePath.endsWith('.ts') ? 'ts' : 'js',
        lines: sf.getLineAndColumnAtPos(sf.getEnd())?.line || 1,
        exports: Array.from(sf.getExportedDeclarations().keys()),
        imports: sf.getImportDeclarations().map(d => d.getModuleSpecifierValue()),
        env: Array.from(envVars),
        hash: `sha256:${hash}`
      };
      return info;
    })
  };
  
  writeFileSync(`${OUT_DIR}/repo.catalog.json`, JSON.stringify(catalog, null, 2));
  console.log(`✅ Generated ${OUT_DIR}/repo.catalog.json`);

  // --- Extract Express routes
  const httpMethods = new Set(['get','post','put','patch','delete','options','head','all']);
  const routeEntries: RouteEntry[] = [];

  function literalText(arg: any) {
    return arg && arg.getLiteralText ? arg.getLiteralText() : undefined;
  }

  for (const sf of files) {
    sf.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const method = pae.getName();
      if (!httpMethods.has(method)) return;

      // router.get('/path', handler) OR app.post('/path', handler)
      const objName = pae.getExpression().getText(); // router/app
      const args = call.getArguments();
      if (!args.length) return;
      const pathArg = args[0];
      const path = literalText(pathArg);
      if (!path) return;

      // best-effort get handler identifier
      const handlerArg = args.find(a => 
        a.getKind() === SyntaxKind.Identifier || 
        a.getKind() === SyntaxKind.PropertyAccessExpression ||
        a.getKind() === SyntaxKind.ArrowFunction ||
        a.getKind() === SyntaxKind.FunctionExpression
      );
      const handler = handlerArg?.getText();

      routeEntries.push({
        method: method.toUpperCase(),
        path,
        file: relative(process.cwd(), sf.getFilePath()).replace(/\\/g, '/'),
        handler
      });
    });
  }

  console.log(`🛣️  Found ${routeEntries.length} routes`);

  // --- Map controllers to services (best-effort)
  const serviceCallsByController = new Map<string, string[]>();

  function indexServiceCalls(file: SourceFile) {
    file.getFunctions().forEach(fn => {
      const key = `${relative(process.cwd(), file.getFilePath()).replace(/\\/g, '/')}:${fn.getName()}`;
      const calls: string[] = [];
      fn.forEachDescendant(n => {
        if (n.getKind() !== SyntaxKind.CallExpression) return;
        const ce = n as CallExpression;
        const callee = ce.getExpression().getText();
        if (/\b(service|svc)\b/.test(callee) || /\.service\./.test(callee)) {
          calls.push(callee);
        }
      });
      if (calls.length) serviceCallsByController.set(key, Array.from(new Set(calls)));
    });
  }

  files.forEach(indexServiceCalls);

  // Attach controller path + service calls when we can resolve it
  const routesEnriched = routeEntries.map(r => {
    if (!r.handler) return r;
    // handler might be "C.publish" or "publish"
    const handlerName = r.handler.split('.').pop();
    const controllerGuess = files.find(sf =>
      /controller\.(ts|tsx|js)$/.test(sf.getBaseName()) &&
      sf.getFunctions().some(fn => fn.getName() === handlerName)
    );
    if (controllerGuess) {
      const key = `${relative(process.cwd(), controllerGuess.getFilePath()).replace(/\\/g, '/')}:${handlerName}`;
      return {
        ...r,
        controller: relative(process.cwd(), controllerGuess.getFilePath()).replace(/\\/g, '/'),
        service_calls: serviceCallsByController.get(key) ?? []
      };
    }
    return r;
  });

  writeFileSync(`${OUT_DIR}/routes.index.json`, JSON.stringify({ 
    server: { 
      framework: 'express', 
      routes: routesEnriched 
    } 
  }, null, 2));
  console.log(`✅ Generated ${OUT_DIR}/routes.index.json`);

  // --- Map tests to routes/services (simple heuristic)
  const testFiles = files.filter(sf => 
    /tests[\\/].*\.(spec|test)\.(ts|js)x?$/.test(sf.getFilePath()) ||
    /__tests__[\\/].*\.(spec|test)\.(ts|js)x?$/.test(sf.getFilePath())
  );
  
  const testIndex = {
    integration: [] as any[],
    unit: [] as any[]
  };
  
  for (const tf of testFiles) {
    const body = tf.getFullText();
    const coversRoutes = routesEnriched.filter(r => 
      body.includes(r.path) || 
      body.includes(r.method) ||
      body.includes(r.handler || '')
    );
    const targets = Array.from(new Set(
      Array.from(serviceCallsByController.values()).flat().filter(c => body.includes(c))
    ));
    const entry = {
      file: relative(process.cwd(), tf.getFilePath()).replace(/\\/g, '/'),
      covers: coversRoutes.map(r => `${r.method} ${r.path}`),
      targets
    };
    (tf.getFilePath().includes('integration') ? testIndex.integration : testIndex.unit).push(entry);
  }
  
  writeFileSync(`${OUT_DIR}/tests.index.json`, JSON.stringify(testIndex, null, 2));
  console.log(`✅ Generated ${OUT_DIR}/tests.index.json`);

  // --- Mermaid dependency graph
  const edges = new Set<string>();
  const nodeLabels = new Map<string, string>();
  
  routesEnriched.forEach(r => {
    const rNode = r.file.replace(/[^\w]/g, '_');
    nodeLabels.set(rNode, `Routes: ${r.file.split('/').pop()}`);
    
    if (r.controller) {
      const cNode = r.controller.replace(/[^\w]/g, '_');
      nodeLabels.set(cNode, `Controller: ${r.controller.split('/').pop()}`);
      edges.add(`${rNode}-->${cNode}`);
      
      (r.service_calls || []).forEach(s => {
        const svcNode = s.replace(/[^\w]/g, '_');
        nodeLabels.set(svcNode, `Service: ${s}`);
        edges.add(`${cNode}-->${svcNode}`);
      });
    }
  });
  
  let mmd = 'graph TD\n';
  Array.from(edges).forEach(e => { 
    const [from, to] = e.split('-->');
    const fromLabel = nodeLabels.get(from) || from;
    const toLabel = nodeLabels.get(to) || to;
    mmd += `  ${from}["${fromLabel}"] --> ${to}["${toLabel}"]\n`; 
  });
  
  writeFileSync(`${OUT_DIR}/deps.graph.mmd`, mmd);
  console.log(`✅ Generated ${OUT_DIR}/deps.graph.mmd`);

  // --- Agent README
  const readme = `# Repo Catalog (for agents)

This directory contains machine-readable catalogs of the codebase structure, generated automatically from the source code.

## Files

- **repo.catalog.json** - Main index: files, imports, exports, environment variable usage, and content hashes
- **routes.index.json** - Express routes mapped to controllers and service calls
- **tests.index.json** - Test files mapped to the routes/services they cover
- **deps.graph.mmd** - Mermaid diagram showing module dependency relationships

## Usage for AI Agents

Use these files as structured context when:
- Understanding the codebase architecture
- Finding related files and dependencies
- Mapping API endpoints to their implementations
- Understanding test coverage
- Analyzing module relationships

## Ground Truth

The source code is the ground truth. These catalogs are generated automatically and should be regenerated when:
- New routes are added
- Controllers or services are refactored
- Test files are added or moved
- Dependencies change

## Regeneration

Run \`npm run catalog:generate\` to regenerate all catalog files.

Do not manually edit these files - they will be overwritten on the next generation.
`;
  
  writeFileSync(`${OUT_DIR}/README.md`, readme);
  console.log(`✅ Generated ${OUT_DIR}/README.md`);

  console.log('🎉 Repo catalog generation complete!');
  console.log(`📊 Generated ${catalog.files.length} file entries, ${routeEntries.length} routes, ${testFiles.length} test files`);
})();
