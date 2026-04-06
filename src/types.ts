// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
export type FallbackImplementation<Y extends any[], T> = (...args: Y) => T

// biome-ignore lint/suspicious/noExplicitAny: This is necessary to support any matcher that has an asymmetricMatch function, not just our own Matcher class.
export type CalledWithImplementation<Y extends any[], T> = (...args: Y) => T | undefined
