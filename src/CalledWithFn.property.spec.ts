import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { calledWithFn, matches } from './index'

describe('calledWithFn properties', () => {
  it('preserves an existing mock and its fallback for unmatched arguments', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.array(fc.string()), (configured, result, inputs) => {
        const existing = vi.fn((value: string) => `fallback:${value}`)
        const mocked = calledWithFn({ mock: existing })

        mocked.calledWith(configured).mockReturnValue(result)

        expect(mocked).toBe(existing)
        expect(calledWithFn({ mock: existing })).toBe(mocked)

        for (const input of [...inputs, configured, `${configured}!`]) {
          expect(mocked(input)).toBe(input === configured ? result : `fallback:${input}`)
        }

        expect(existing.mock.calls).toEqual([...inputs, configured, `${configured}!`].map((input) => [input]))
      })
    )
  })

  it('combines custom and Vitest matchers for generated arguments', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), fc.string(), fc.string(), (minimum, value, fragment, text) => {
        const mocked = calledWithFn<boolean, [number, string]>({ fallbackMockImplementation: () => false })
        mocked
          .calledWith(
            matches<number>((actual) => actual >= minimum),
            expect.stringContaining(fragment)
          )
          .mockReturnValue(true)

        expect(mocked(value, text)).toBe(value >= minimum && text.includes(fragment))
        expect(mocked(minimum, fragment)).toBe(true)
        expect(mocked(minimum - 1, fragment)).toBe(false)
      })
    )
  })

  it('discards earlier configurations after an existing mock is reset', () => {
    fc.assert(
      fc.property(fc.integer(), fc.string(), (input, result) => {
        const mocked = calledWithFn({ mock: vi.fn<(value: number) => string>() })
        mocked.calledWith(input).mockReturnValue(result)
        mocked.mockReset()
        mocked.calledWith(input + 1).mockReturnValue(result)

        expect(mocked(input)).toBeUndefined()
        expect(mocked(input + 1)).toBe(result)
      })
    )
  })
})
