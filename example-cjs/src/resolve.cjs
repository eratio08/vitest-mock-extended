const resolved = require.resolve('vitest-mock-extended')

if (!resolved.endsWith('/lib/index.cjs')) {
  throw new Error(`Expected CJS entry, got ${resolved}`)
}

console.log(`Resolved CJS entry: ${resolved}`)
