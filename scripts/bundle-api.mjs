import { mkdirSync } from 'node:fs'
import { build } from 'esbuild'

mkdirSync('api', { recursive: true })

await build({
  entryPoints: ['server/app.ts'],
  outfile: 'api/_bundle.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
})

console.log('bundled api/_bundle.mjs')
