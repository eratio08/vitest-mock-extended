import { type Mock, vi } from 'vitest'
import { Matcher, type MatchersOrLiterals } from './Matchers'
import type { CalledWithMock } from './Mock'
import type { CalledWithImplementation, FallbackImplementation } from './types'

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
interface CalledWithStackItem<T, Y extends any[]> {
  args: MatchersOrLiterals<Y>
  calledWithFn: Mock<FallbackImplementation<Y, T>>
}

interface VitestAsymmetricMatcher {
  // biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
  asymmetricMatch(...args: any[]): boolean
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
function isVitestAsymmetricMatcher(obj: any): obj is VitestAsymmetricMatcher {
  return !!obj && typeof obj === 'object' && 'asymmetricMatch' in obj && typeof obj.asymmetricMatch === 'function'
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const checkCalledWith = <T, Y extends any[]>(
  calledWithStack: CalledWithStackItem<T, Y>[],
  actualArgs: Y,
  fallbackMockImplementation?: FallbackImplementation<Y, T>
): T | undefined => {
  const calledWithInstance = calledWithStack.find((instance) =>
    instance.args.every((matcher, i) => {
      if (matcher instanceof Matcher) {
        return matcher.asymmetricMatch(actualArgs[i])
      }

      if (isVitestAsymmetricMatcher(matcher)) {
        return matcher.asymmetricMatch(actualArgs[i])
      }

      return actualArgs[i] === matcher
    })
  )

  return calledWithInstance
    ? calledWithInstance.calledWithFn(...actualArgs)
    : fallbackMockImplementation?.(...actualArgs)
}

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
type CalledWithFnArgs<Y extends any[], T> = {
  fallbackMockImplementation?: FallbackImplementation<Y, T>
  mock?: Mock<CalledWithImplementation<Y, T>>
}

const decoratedMocks = new WeakMap<object, unknown>()

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const calledWithFn = <T, Y extends any[]>({
  fallbackMockImplementation,
  mock: existingMock,
}: CalledWithFnArgs<Y, T> = {}): CalledWithMock<T, Y> => {
  if (existingMock) {
    const decoratedMock = decoratedMocks.get(existingMock as object)
    if (decoratedMock) {
      return decoratedMock as CalledWithMock<T, Y>
    }
  }

  const fn: Mock<CalledWithImplementation<Y, T>> =
    existingMock ?? (fallbackMockImplementation ? vi.fn(fallbackMockImplementation) : vi.fn())
  const existingMockImplementation = existingMock?.getMockImplementation()
  const effectiveFallbackMockImplementation = fallbackMockImplementation ?? existingMockImplementation
  let calledWithStack: CalledWithStackItem<T, Y>[] = []
  let hasCalledWithImplementation = false

  ;(fn as CalledWithMock<T, Y>).calledWith = (...args) => {
    // We create new function to delegate any interactions (mockReturnValue etc.) to for this set of args.
    // If that set of args is matched, we just call that vi.fn() for the result.
    const calledWithFn: Mock<FallbackImplementation<Y, T>> = fallbackMockImplementation
      ? vi.fn(fallbackMockImplementation)
      : vi.fn()
    const mockImplementation = fn.getMockImplementation()
    if (
      (existingMock && (!hasCalledWithImplementation || !mockImplementation)) ||
      (!existingMock &&
        (!mockImplementation ||
          fn.getMockImplementation()?.name === 'implementation' ||
          mockImplementation === fallbackMockImplementation))
    ) {
      // Our original function gets a mock implementation which handles the matching
      fn.mockImplementation((...args: Y) => checkCalledWith(calledWithStack, args, effectiveFallbackMockImplementation))
      calledWithStack = []
      hasCalledWithImplementation = true
    }
    calledWithStack.unshift({ args, calledWithFn })

    return calledWithFn
  }

  const decoratedMock = fn as CalledWithMock<T, Y>
  decoratedMocks.set(fn, decoratedMock)
  return decoratedMock
}

export { calledWithFn }
