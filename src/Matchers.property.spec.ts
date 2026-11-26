import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  anyArray,
  anyBoolean,
  anyNumber,
  anyObject,
  anyString,
  captor,
  type MatcherLike,
  mockFn,
  notEmpty,
  objectContainsKey,
  objectContainsValue,
} from './index'

describe('matcher properties', () => {
  it('type and empty-value matchers agree with JavaScript checks', () => {
    fc.assert(
      fc.property(fc.oneof(fc.anything(), fc.double()), (value) => {
        const numberMatcher: MatcherLike<unknown> = anyNumber()
        const booleanMatcher: MatcherLike<unknown> = anyBoolean()
        const stringMatcher: MatcherLike<unknown> = anyString()
        const arrayMatcher: MatcherLike<unknown> = anyArray()

        expect(numberMatcher.asymmetricMatch(value)).toBe(typeof value === 'number' && !Number.isNaN(value))
        expect(booleanMatcher.asymmetricMatch(value)).toBe(typeof value === 'boolean')
        expect(stringMatcher.asymmetricMatch(value)).toBe(typeof value === 'string')
        expect(arrayMatcher.asymmetricMatch(value)).toBe(Array.isArray(value))
        expect(anyObject().asymmetricMatch(value)).toBe(typeof value === 'object' && value !== null)
        expect(notEmpty().asymmetricMatch(value)).toBe(value !== null && value !== undefined && value !== '')
      })
    )
  })

  it('matches defined keys in generated objects', () => {
    const entryValue = fc.oneof(fc.integer(), fc.constant(null), fc.constant(undefined))

    fc.assert(
      fc.property(fc.dictionary(fc.string(), entryValue), fc.string(), (entries, key) => {
        const object = Object.assign(Object.create(null), entries) as Record<string, number | null | undefined>

        expect(objectContainsKey(key).asymmetricMatch(object)).toBe(
          Object.hasOwn(object, key) && object[key] !== undefined
        )
        for (const [presentKey, value] of Object.entries(object)) {
          expect(objectContainsKey(presentKey).asymmetricMatch(object)).toBe(value !== undefined)
        }
      })
    )
  })

  it('matches generated object values by identity', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (values) => {
        const nested = { values }
        const object = { ...Object.fromEntries(values.map((value, index) => [String(index), value])), nested }

        for (const value of values) {
          expect(objectContainsValue(value).asymmetricMatch(object)).toBe(true)
        }
        expect(objectContainsValue(nested).asymmetricMatch(object)).toBe(true)
        expect(objectContainsValue({ values }).asymmetricMatch(object)).toBe(false)
      })
    )
  })

  it('captures every argument in order when used with calledWith', () => {
    fc.assert(
      fc.property(fc.array(fc.jsonValue(), { minLength: 1 }), (values) => {
        const captured = captor<unknown>()
        const mocked = mockFn<(value: unknown) => boolean>()
        mocked.calledWith(captured).mockReturnValue(true)

        for (const value of values) {
          expect(mocked(value)).toBe(true)
        }

        expect(captured.values).toEqual(values)
        expect(captured.value).toBe(values[values.length - 1])
      })
    )
  })
})
