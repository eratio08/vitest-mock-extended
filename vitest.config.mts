import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    ...configDefaults,
    includeSource: ['./src'],

    exclude: [...configDefaults.exclude, 'lib/**'],
    coverage: {
      ...configDefaults.coverage,
      exclude: [...(configDefaults.coverage?.exclude ?? []), '**/*.spec.ts', 'lib/**'],
    },
  },
})
