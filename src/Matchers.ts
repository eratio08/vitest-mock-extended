type MatcherFn<T> = (actualValue: T) => boolean

interface MatcherLike<_> {
  asymmetricMatch(other: unknown): boolean
  toString(): string
  getExpectedType?(): string
  toAsymmetricMatcher?(): string
}

// needs to be a class so we can instanceof
class Matcher<T> implements MatcherLike<T> {
  $$typeof: symbol
  inverse?: boolean

  constructor(
    readonly asymmetricMatch: MatcherFn<T>,
    private readonly description: string
  ) {
    this.$$typeof = Symbol.for('vi.asymmetricMatcher')
  }

  toString() {
    return this.description
  }

  toAsymmetricMatcher() {
    return this.description
  }

  getExpectedType() {
    return 'undefined'
  }
}

class CaptorMatcher<T> {
  $$typeof: symbol
  public readonly asymmetricMatch: MatcherFn<T>
  public readonly value!: T
  public readonly values: T[] = []
  constructor() {
    this.$$typeof = Symbol.for('vi.asymmetricMatcher')

    this.asymmetricMatch = (actualValue: T) => {
      // @ts-expect-error value should be read-only but we need to set it
      this.value = actualValue
      this.values.push(actualValue)
      return true
    }
  }

  getExpectedType() {
    return 'Object'
  }

  toString() {
    return 'captor'
  }

  toAsymmetricMatcher() {
    return 'captor'
  }
}

type MatcherCreator<T, E = T> = (expectedValue?: E) => Matcher<T>

type MatchersOrLiterals<Y extends unknown[]> = { [K in keyof Y]: MatcherLike<Y[K]> | Y[K] }

const any: MatcherCreator<unknown> = () => new Matcher(() => true, 'any()')
const anyBoolean: MatcherCreator<boolean> = () =>
  new Matcher((actualValue: boolean) => typeof actualValue === 'boolean', 'anyBoolean()')
const anyNumber: MatcherCreator<number> = () =>
  new Matcher((actualValue) => typeof actualValue === 'number' && !Number.isNaN(actualValue), 'anyNumber()')
const anyString: MatcherCreator<string> = () =>
  new Matcher((actualValue: string) => typeof actualValue === 'string', 'anyString()')
const anyFunction: MatcherCreator<CallableFunction> = () =>
  new Matcher((actualValue: CallableFunction) => typeof actualValue === 'function', 'anyFunction()')
const anySymbol: MatcherCreator<symbol> = () =>
  new Matcher((actualValue) => typeof actualValue === 'symbol', 'anySymbol()')
const anyObject: MatcherCreator<unknown> = () =>
  new Matcher((actualValue) => typeof actualValue === 'object' && actualValue !== null, 'anyObject()')

const anyArray: MatcherCreator<unknown[]> = () => new Matcher((actualValue) => Array.isArray(actualValue), 'anyArray()')
const anyMap: MatcherCreator<Map<unknown, unknown>> = () =>
  new Matcher((actualValue) => actualValue instanceof Map, 'anyMap()')
const anySet: MatcherCreator<Set<unknown>> = () => new Matcher((actualValue) => actualValue instanceof Set, 'anySet()')

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any class, not just ones that extend a specific base class.
const isA: MatcherCreator<any> = (clazz) => new Matcher((actualValue) => actualValue instanceof clazz, 'isA()')

const arrayIncludes: MatcherCreator<unknown[], unknown> = (arrayVal) =>
  new Matcher((actualValue) => Array.isArray(actualValue) && actualValue.includes(arrayVal), 'arrayIncludes()')
const setHas: MatcherCreator<Set<unknown>, unknown> = (arrayVal) =>
  new Matcher((actualValue) => anySet().asymmetricMatch(actualValue) && actualValue.has(arrayVal), 'setHas()')
const mapHas: MatcherCreator<Map<unknown, unknown>, unknown> = (mapVal) =>
  new Matcher((actualValue) => anyMap().asymmetricMatch(actualValue) && actualValue.has(mapVal), 'mapHas()')
const objectContainsKey: MatcherCreator<Record<string, unknown>, string> = (key) =>
  new Matcher(
    // biome-ignore lint/style/noNonNullAssertion: We know key is defined since it's a parameter, but the type definition for asymmetricMatch requires us to check it at runtime.
    (actualValue) => anyObject().asymmetricMatch(actualValue) && actualValue[key!] !== undefined,
    'objectContainsKey()'
  )
const objectContainsValue: MatcherCreator<Record<string, unknown> | ArrayLike<unknown>> = (value) =>
  new Matcher(
    (actualValue) => anyObject().asymmetricMatch(actualValue) && Object.values(actualValue).includes(value),
    'objectContainsValue()'
  )

const notNull: MatcherCreator<unknown> = () => new Matcher((actualValue) => actualValue !== null, 'notNull()')
const notUndefined: MatcherCreator<unknown> = () =>
  new Matcher((actualValue) => actualValue !== undefined, 'notUndefined()')
const notEmpty: MatcherCreator<unknown> = () =>
  new Matcher((actualValue) => actualValue !== null && actualValue !== undefined && actualValue !== '', 'notEmpty()')

const captor = <T>() => new CaptorMatcher<T>()
const matches = <T>(matcher: MatcherFn<T>) => new Matcher(matcher, 'matches()')

export type { MatcherCreator, MatcherFn, MatcherLike, MatchersOrLiterals }
export {
  any,
  anyArray,
  anyBoolean,
  anyFunction,
  anyMap,
  anyNumber,
  anyObject,
  anySet,
  anyString,
  anySymbol,
  arrayIncludes,
  CaptorMatcher,
  captor,
  isA,
  Matcher,
  mapHas,
  matches,
  notEmpty,
  notNull,
  notUndefined,
  objectContainsKey,
  objectContainsValue,
  setHas,
}
