import type { DeepPartial } from 'ts-essentials'
import { type Mock, vi } from 'vitest'
import { calledWithFn } from './CalledWithFn'
import type { MatchersOrLiterals } from './Matchers'
import type { FallbackImplementation } from './types'

type ProxiedProperty = string | number | symbol

interface GlobalConfig {
  // ignoreProps is required when we don't want to return anything for a mock (for example, when mocking a promise).
  ignoreProps?: ProxiedProperty[]
}

const DEFAULT_CONFIG: GlobalConfig = {
  ignoreProps: ['then'],
}

let GLOBAL_CONFIG = DEFAULT_CONFIG

const VitestMockExtended = {
  DEFAULT_CONFIG,
  configure: (config: GlobalConfig) => {
    // Shallow merge so they can override anything they want.
    GLOBAL_CONFIG = { ...DEFAULT_CONFIG, ...config }
  },
  resetConfig: () => {
    GLOBAL_CONFIG = DEFAULT_CONFIG
  },
}

interface CalledWithMock<T, Y extends any[]> extends Mock<FallbackImplementation<Y, T>> {
  calledWith: (...args: Y | MatchersOrLiterals<Y>) => Mock<FallbackImplementation<Y, T>>
}

type _MockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer B ? T[K] & CalledWithMock<B, A> : T[K]
}

type MockProxy<T> = _MockProxy<T> & T

type _DeepMockProxy<T> = {
  // This supports deep mocks in the else branch
  [K in keyof T]: T[K] extends (...args: infer A) => infer B ? T[K] & CalledWithMock<B, A> : T[K] & _DeepMockProxy<T[K]>
}

// we intersect with T here instead of on the mapped type above to
// prevent immediate type resolution on a recursive type, this will
// help to improve performance for deeply nested recursive mocking
// at the same time, this intersection preserves private properties
type DeepMockProxy<T> = _DeepMockProxy<T> & T

type _DeepMockProxyWithFuncPropSupport<T> = {
  // This supports deep mocks in the else branch
  [K in keyof T]: T[K] extends (...args: infer A) => infer B
    ? CalledWithMock<B, A> & DeepMockProxy<T[K]>
    : DeepMockProxy<T[K]>
}

type DeepMockProxyWithFuncPropSupport<T> = _DeepMockProxyWithFuncPropSupport<T> & T

interface MockOpts {
  deep?: boolean
  useActualToJSON?: boolean
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  fallbackMockImplementation?: (...args: any[]) => any
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const mockClear = (mock: MockProxy<any>) => {
  for (const key of Object.keys(mock)) {
    const value = mock[key]
    if (value === null || value === undefined) {
      continue
    }

    if (value._isMockObject) {
      mockClear(value)
    }

    if (value._isMockFunction && 'mockClear' in value) {
      value.mockClear()
    }
  }

  // This is a catch for if they pass in a vi.fn()
  if (!mock._isMockObject) {
    return mock.mockClear()
  }
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const mockReset = (mock: MockProxy<any>) => {
  for (const key of Object.keys(mock)) {
    if (mock[key] === null || mock[key] === undefined) {
      continue
    }

    if (mock[key]._isMockObject) {
      mockReset(mock[key])
    }
    if (mock[key]._isMockFunction) {
      mock[key].mockReset()
    }
  }

  // This is a catch for if they pass in a vi.fn()
  // Worst case, we will create a vi.fn() (since this is a proxy)
  // below in the get and call mockReset on it
  if (!mock._isMockObject) {
    return mock.mockReset()
  }
}

function mockDeep<T>(
  opts: {
    funcPropSupport?: true
    fallbackMockImplementation?: MockOpts['fallbackMockImplementation']
  },
  mockImplementation?: DeepPartial<T>
): DeepMockProxyWithFuncPropSupport<T>
function mockDeep<T>(mockImplementation?: DeepPartial<T>): DeepMockProxy<T>
// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
function mockDeep(arg1: any, arg2?: any) {
  const [opts, mockImplementation] =
    typeof arg1 === 'object' && (typeof arg1.fallbackMockImplementation === 'function' || arg1.funcPropSupport === true)
      ? [arg1, arg2]
      : [{}, arg1]
  return mock(mockImplementation, { deep: true, fallbackMockImplementation: opts.fallbackMockImplementation })
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const overrideMockImp = (obj: DeepPartial<any>, opts?: MockOpts) => {
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  const proxy = new Proxy<MockProxy<any>>(obj, handler(opts))
  for (const name of Object.keys(obj)) {
    if (typeof obj[name] === 'object' && obj[name] !== null) {
      proxy[name] = overrideMockImp(obj[name], opts)
    } else {
      proxy[name] = obj[name]
    }
  }

  return proxy
}

const handler = (opts?: MockOpts) => ({
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  ownKeys(target: MockProxy<any>) {
    return Reflect.ownKeys(target)
  },

  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  set: (obj: MockProxy<any>, property: ProxiedProperty, value: any) => {
    obj[property] = value
    return true
  },

  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  get: (obj: MockProxy<any>, property: ProxiedProperty) => {
    if (!(property in obj)) {
      if (property === '_isMockObject' || property === '_isMockFunction') {
        return undefined
      }

      if (GLOBAL_CONFIG.ignoreProps?.includes(property)) {
        return undefined
      }
      // Jest's internal equality checking does some wierd stuff to check for iterable equality
      if (property === Symbol.iterator) {
        return obj[property]
      }

      if (opts?.useActualToJSON && property === 'toJSON') {
        return JSON.stringify(obj)
      }

      // So this calls check here is totally not ideal - jest internally does a
      // check to see if this is a spy - which we want to say no to, but blindly returning
      // an proxy for calls results in the spy check returning true. This is another reason
      // why deep is opt in.
      const fn = calledWithFn({ fallbackMockImplementation: opts?.fallbackMockImplementation })
      if (opts?.deep && property !== 'calls') {
        // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
        obj[property] = new Proxy<MockProxy<any>>(fn, handler(opts))
        obj[property]._isMockObject = true
      } else {
        obj[property] = fn
      }
    }

    // @ts-expect-error expected type mismatch due to any
    if (obj instanceof Date && typeof obj[property] === 'function') {
      // @ts-expect-error expected type mismatch due to any
      return obj[property].bind(obj)
    }

    return obj[property]
  },
})

const mock = <T, MockedReturn extends MockProxy<T> & T = MockProxy<T> & T>(
  mockImplementation: DeepPartial<T> = {} as DeepPartial<T>,
  opts?: MockOpts
): MockedReturn => {
  // @ts-expect-error private
  // biome-ignore lint/style/noNonNullAssertion: We know this is defined since we set it on the object below, but the type definition for Proxy requires us to check it at runtime.
  mockImplementation!._isMockObject = true
  return overrideMockImp(mockImplementation, opts)
}

const mockFn = <
  T,
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  A extends any[] = T extends (...args: infer AReal) => any ? AReal : any[],
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  R = T extends (...args: any) => infer RReal ? RReal : any,
>(): CalledWithMock<R, A> & T => {
  // @ts-expect-error hard to get this type right using any
  return calledWithFn()
}

function mocked<T>(obj: T, deep?: false): ReturnType<typeof mock<T>>
function mocked<T>(obj: T, deep: true): ReturnType<typeof mockDeep<T>>
function mocked<T>(obj: T, _deep?: boolean) {
  return obj
}

function mockedFn<T>(obj: T) {
  return obj as ReturnType<typeof mockFn<T>>
}

const stub = <T extends object>(): T => {
  return new Proxy<T>({} as T, {
    get: (obj, property: ProxiedProperty) => {
      if (property in obj) {
        // @ts-expect-error expected
        return obj[property]
      }
      return vi.fn()
    },
  })
}

export type { CalledWithMock, DeepMockProxy, GlobalConfig, MockOpts, MockProxy }
export { mock, mockClear, mockDeep, mocked, mockedFn, mockFn, mockReset, stub, VitestMockExtended }
