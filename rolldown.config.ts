import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json' with { type: 'json' }

const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]
const input = 'src/index.ts'
const declaration = () =>
  dts({
    generator: 'tsc',
    emitDtsOnly: true,
  })

export default [
  defineConfig({
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
  }),
  defineConfig({
    input,
    plugins: [declaration()],
    output: {
      dir: 'lib/esm',
      entryFileNames: '[name].js',
      format: 'es',
      sourcemap: true,
    },
    external,
  }),
  defineConfig({
    input,
    plugins: [declaration()],
    output: {
      dir: 'lib',
      entryFileNames: '[name].cjs',
      format: 'es',
      sourcemap: true,
    },
    external,
  }),
]
