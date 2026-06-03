import { build, analyzeMetafile } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: ['dist/lambda.js'],
  absWorkingDir: __dirname,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/bundle.js',
  metafile: true,
  external: [
    // C native addons — must ship as real files, cannot be inlined
    'pg-native',
    '@mapbox/node-pre-gyp',
    'cpu-features',
    'ssh2',
    'fsevents',
    // NestJS optional federation/gateway/fastify peer deps not used in this project
    '@nestjs/websockets',
    '@nestjs/microservices',
    '@apollo/subgraph',
    '@apollo/subgraph/*',
    '@apollo/gateway',
    '@as-integrations/fastify',
    // ts-morph is used by @nestjs/graphql only for schema-first (not code-first)
    'ts-morph',
    // class-transformer lazy-loads its storage module; must stay external
    'class-transformer/storage',
    // Test utilities pulled in by transitive deps
    'mock-aws-s3',
    'nock',
    'aws-sdk',
  ],
  minify: true,
  // Preserve class/function names — NestJS metadata reflection and GraphQL code-first
  // schema generation depend on runtime class names. Without this, esbuild minification
  // can produce names like "$R" which are invalid GraphQL identifiers.
  keepNames: true,
  treeShaking: true,
  logLevel: 'info',
});

// Print bundle composition to identify what's taking space
const analysis = await analyzeMetafile(result.metafile, { verbose: false });
console.log('\n--- Bundle analysis (top contributors) ---\n');
console.log(analysis);
