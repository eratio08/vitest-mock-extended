import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'vitest-mock-extended': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    ...configDefaults,
    includeSource: ['./src'],

    exclude: [...configDefaults.exclude, 'lib/**', 'example/**', 'example-cjs/**'],
    coverage: {
      ...configDefaults.coverage,
      exclude: [...(configDefaults.coverage?.exclude ?? []), '**/*.spec.ts', 'lib/**'],
    },
  },
})
