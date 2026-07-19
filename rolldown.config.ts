import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]
const input = 'src/index.ts'

export default defineConfig({
  input,
  output: [
    {
      dir: 'lib',
      entryFileNames: 'index.cjs',
      cleanDir: true,
      format: 'cjs',
      sourcemap: true,
    },
    {
      dir: 'lib/esm',
      entryFileNames: 'index.js',
      cleanDir: true,
      format: 'es',
      sourcemap: true,
    },
  ],
  external,
})
