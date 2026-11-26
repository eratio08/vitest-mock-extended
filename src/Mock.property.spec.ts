import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { anyString, arrayIncludes, mapHas, setHas } from './Matchers'
import { mock, mockClear, mockDeep, mockReset, stub } from './Mock'

describe('property-based mock tests', () => {
  it('uses the latest matching calledWith configuration or the fallback', () => {
    const argument = fc.integer({ min: -3, max: 3 })
    const configuration = fc.tuple(argument, argument, fc.nat(1000))

    fc.assert(
      fc.property(fc.array(configuration), fc.array(fc.tuple(argument, argument)), (configurations, queries) => {
        const mocked = mock<{ lookup: (first: number, second: number) => number }>(
          {},
          { fallbackMockImplementation: () => -1 }
        )

        for (const [first, second, result] of configurations) {
          mocked.lookup.calledWith(first, second).mockReturnValue(result)
        }

        for (const [first, second] of [...queries, ...configurations]) {
          const matching = [...configurations].reverse().find(([a, b]) => a === first && b === second)
          expect(mocked.lookup(first, second)).toBe(matching?.[2] ?? -1)
        }
      })
    )
  })

  it('collection matchers agree with native membership checks', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.integer(), (values, value) => {
        const set = new Set(values)
        const map = new Map(values.map((entry) => [entry, true]))

        expect(arrayIncludes(value).asymmetricMatch(values)).toBe(values.includes(value))
        expect(setHas(value).asymmetricMatch(set)).toBe(set.has(value))
        expect(mapHas(value).asymmetricMatch(map)).toBe(map.has(value))
      })
    )
  })

  it('preserves initialized values and caches generated deep mock methods', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer(), fc.boolean(), (name, count, enabled) => {
        const mocked = mockDeep<{ user: { name: string; count: number; read: () => string }; enabled: boolean }>({
          user: { name, count },
          enabled,
        })

        expect(mocked.user.name).toBe(name)
        expect(mocked.user.count).toBe(count)
        expect(mocked.enabled).toBe(enabled)
        expect(mocked.user.read).toBe(mocked.user.read)

        mocked.user.name = `${name}!`
        expect(mocked.user.name).toBe(`${name}!`)
      })
    )
  })

  it('resets nested mock implementations and call histories', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()),
        fc.string(),
        fc.option(fc.constant(null), { nil: undefined }),
        (calls, result, empty) => {
          const mocked = mockDeep<{ service: { lookup: (key: string) => string; empty?: null } }>()
          mocked.service.empty = empty
          mocked.service.lookup.mockReturnValue(result)

          for (const key of calls) {
            expect(mocked.service.lookup(key)).toBe(result)
          }

          mockReset(mocked)
          expect(mocked.service.empty).toBe(empty)
          expect(mocked.service.lookup.mock.calls).toEqual([])
          expect(mocked.service.lookup('after reset')).toBeUndefined()
          mocked.service.lookup.mockReturnValue(result)
          expect(mocked.service.lookup('after reset')).toBe(result)
        }
      )
    )
  })

  it('resets implementations inside initialized nested mocks', () => {
    const mocked = mockDeep<{ service: { lookup: () => string } }>({ service: {} })
    mocked.service.lookup.mockReturnValue('configured')

    mockReset(mocked)

    expect(mocked.service.lookup()).toBeUndefined()
  })

  it('resets mocks inside initialized shallow mocks without adding properties', () => {
    const service = { lookup: vi.fn<() => string>().mockReturnValue('configured'), name: 'service' }
    const mocked = mock<{ service: { lookup: () => string; name: string } }>({ service })

    expect(mocked.service.lookup()).toBe('configured')
    mockReset(mocked)

    expect(service.lookup.mock.calls).toEqual([])
    expect(mocked.service.lookup()).toBeUndefined()
    expect(service.name).toBe('service')
    expect(Object.keys(service)).toEqual(['lookup', 'name'])
  })

  it('clears calls inside initialized nested mocks without removing behavior', () => {
    const mocked = mockDeep<{ service: { api: { lookup: (key: string) => string }; name: string } }>({
      service: { api: {}, name: 'service' },
    })
    mocked.service.api.lookup.calledWith('key').mockReturnValue('result')

    expect(mocked.service.api.lookup('key')).toBe('result')
    mockClear(mocked)

    expect(mocked.service.api.lookup.mock.calls).toEqual([])
    expect(mocked.service.api.lookup('key')).toBe('result')
    expect(mocked.service.name).toBe('service')
  })

  it('provides callable stubs and preserves assigned values', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), fc.string(), (inputs, label) => {
        const object = stub<{ execute: (value: number) => string; label: string }>()
        const execute = object.execute
        object.label = label

        expect(vi.isMockFunction(execute)).toBe(true)
        for (const input of inputs) {
          expect(execute(input)).toBeUndefined()
        }
        expect(vi.mocked(execute).mock.calls).toEqual(inputs.map((input) => [input]))
        expect(object.label).toBe(label)
      })
    )
  })

  it('clears deep mock call history without removing configured behavior', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), fc.string(), (calls, nextCall) => {
        const mocked = mockDeep<{ service: { lookup: (key: string) => string } }>()
        mocked.service.lookup.calledWith(anyString()).mockReturnValue('found')

        for (const key of calls) {
          expect(mocked.service.lookup(key)).toBe('found')
        }

        expect(mocked.service.lookup.mock.calls).toEqual(calls.map((key) => [key]))
        mockClear(mocked)
        expect(mocked.service.lookup.mock.calls).toEqual([])
        expect(mocked.service.lookup(nextCall)).toBe('found')
        expect(mocked.service.lookup.mock.calls).toEqual([[nextCall]])
      })
    )
  })
})
