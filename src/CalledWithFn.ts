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
type CalledWithFnArgs<Y extends any[], T> = { fallbackMockImplementation?: FallbackImplementation<Y, T> }

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
const calledWithFn = <T, Y extends any[]>({
  fallbackMockImplementation,
}: CalledWithFnArgs<Y, T> = {}): CalledWithMock<T, Y> => {
  const fn: Mock<CalledWithImplementation<Y, T>> = fallbackMockImplementation
    ? vi.fn(fallbackMockImplementation)
    : vi.fn()
  let calledWithStack: CalledWithStackItem<T, Y>[] = []

  ;(fn as CalledWithMock<T, Y>).calledWith = (...args) => {
    // We create new function to delegate any interactions (mockReturnValue etc.) to for this set of args.
    // If that set of args is matched, we just call that vi.fn() for the result.
    const calledWithFn: Mock<FallbackImplementation<Y, T>> = fallbackMockImplementation
      ? vi.fn(fallbackMockImplementation)
      : vi.fn()
    const mockImplementation = fn.getMockImplementation()
    if (
      !mockImplementation ||
      fn.getMockImplementation()?.name === 'implementation' ||
      mockImplementation === fallbackMockImplementation
    ) {
      // Our original function gets a mock implementation which handles the matching
      fn.mockImplementation((...args: Y) => checkCalledWith(calledWithStack, args, fallbackMockImplementation))
      calledWithStack = []
    }
    calledWithStack.unshift({ args, calledWithFn })

    return calledWithFn
  }

  return fn as CalledWithMock<T, Y>
}

export { calledWithFn }
