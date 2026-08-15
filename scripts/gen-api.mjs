#!/usr/bin/env node
/**
 * Regenera src/types/api.ts desde el /openapi.json del backend
 * (CLAUDE.md: "Tipos desde OpenAPI, nunca a mano").
 *
 * Uso:
 *   npm run gen:api          → escribe src/types/api.ts
 *   npm run gen:api:check    → falla si src/types/api.ts está desactualizado
 *                               (detecta drift de la API en CI antes del deploy)
 *
 * Fuente del schema, en orden:
 *   1. $VITE_API_URL/openapi.json (o https://compraventa-backend-dev.fly.dev por defecto)
 *   2. ./openapi.json local, si existe (fallback sin red)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const root = fileURLToPath(new URL('..', import.meta.url))
const outPath = new URL('../src/types/api.ts', import.meta.url)
const localSpecPath = new URL('../openapi.json', import.meta.url)
const check = process.argv.includes('--check')

try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // .env es opcional (no existe en CI ni en checkout limpio)
}

const apiUrl = process.env.VITE_API_URL ?? 'https://compraventa-backend-dev.fly.dev'

async function loadSchema() {
  if (existsSync(localSpecPath)) {
    console.log(`[gen:api] usando spec local: ${fileURLToPath(localSpecPath)}`)
    return JSON.parse(readFileSync(localSpecPath, 'utf-8'))
  }
  const specUrl = `${apiUrl.replace(/\/$/, '')}/openapi.json`
  console.log(`[gen:api] descargando spec: ${specUrl}`)
  return new URL(specUrl)
}

const HEADER = `/**
 * GENERADO por \`npm run gen:api\` desde /openapi.json — no editar a mano.
 * Si un shape no cuadra, se regenera; nunca se "corrige" el tipo aquí.
 */\n`

const schema = await loadSchema()
const ast = await openapiTS(schema)
const contents = HEADER + astToString(ast)

if (check) {
  if (!existsSync(outPath)) {
    console.error('[gen:api:check] src/types/api.ts no existe — corre `npm run gen:api`.')
    process.exit(1)
  }
  const current = readFileSync(outPath, 'utf-8')
  if (current !== contents) {
    console.error(
      '[gen:api:check] src/types/api.ts está desactualizado respecto al openapi.json del backend.\n' +
        'Corre `npm run gen:api` y commitea el resultado.',
    )
    process.exit(1)
  }
  console.log('[gen:api:check] src/types/api.ts está al día.')
  process.exit(0)
}

writeFileSync(outPath, contents)
console.log(`[gen:api] escrito ${fileURLToPath(outPath).replace(root, '')}`)
