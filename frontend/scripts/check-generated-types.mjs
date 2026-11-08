import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))
const cliPath = fileURLToPath(
  new URL('../node_modules/openapi-typescript/bin/cli.js', import.meta.url),
)
const expected = execFileSync(
  process.execPath,
  [cliPath, '../shared/openapi.json'],
  { cwd: frontendRoot, encoding: 'utf8' },
)
const outputPath = fileURLToPath(
  new URL('../src/types/api.generated.ts', import.meta.url),
)

if (readFileSync(outputPath, 'utf8') !== expected) {
  console.error(
    'Tipos OpenAPI desatualizados. Execute `just types` para regenerar o arquivo.',
  )
  process.exitCode = 1
}
