import { beforeEach, describe, expect, test, vi } from 'vitest'
import { aFunction } from '../test/vi-mock-fixture'
import { mockFn } from './Mock'

vi.mock('../test/vi-mock-fixture')

const mockedAFunction = vi.mocked(aFunction)

describe('mockFn with an existing Vitest mock', () => {
  beforeEach(() => {
    mockedAFunction.mockReset()
  })

  test('configures argument-specific behavior on a vi.mock function', () => {
    const existingMock = mockedAFunction
    const configuredMock = mockFn(existingMock)

    configuredMock.calledWith('foobar').mockReturnValue(true)

    expect(configuredMock).toBe(existingMock)
    expect(configuredMock('foobar')).toBe(true)
    expect(configuredMock('other')).toBeUndefined()
  })

  test('retains Vitest identity, call history, and mock APIs', () => {
    const existingMock = mockedAFunction
    const configuredMock = mockFn(existingMock)

    configuredMock.mockName('module function')
    configuredMock('foobar')

    expect(configuredMock).toBe(existingMock)
    expect(configuredMock.getMockName()).toBe('module function')
    expect(existingMock).toHaveBeenCalledWith('foobar')
    expect(existingMock).toHaveBeenCalledTimes(1)
  })

  test('reuses the decoration when the same mock is passed twice', () => {
    const configuredMock = mockFn(mockedAFunction)
    configuredMock.calledWith('first').mockReturnValue(true)

    const redecoratedMock = mockFn(mockedAFunction)
    redecoratedMock.calledWith('second').mockReturnValue(true)

    expect(redecoratedMock).toBe(configuredMock)
    expect(redecoratedMock('first')).toBe(true)
    expect(redecoratedMock('second')).toBe(true)
    expect(redecoratedMock('other')).toBeUndefined()
  })

  test('rejects a non-Vitest function', () => {
    const realFunction = () => true

    expect(() => mockFn(realFunction)).toThrow('mockFn expects a Vitest mock function')
  })

  test('can be configured again after the existing mock is reset', () => {
    const configuredMock = mockFn(mockedAFunction)

    configuredMock.calledWith('first').mockReturnValue(true)
    configuredMock.mockReset()
    configuredMock.calledWith('second').mockReturnValue(true)

    expect(configuredMock('first')).toBeUndefined()
    expect(configuredMock('second')).toBe(true)
  })
})

describe('mockFn type compatibility', () => {
  test('supports explicitly typed functions without an existing mock', () => {
    type MyFn = (value: number) => string
    const configuredMock = mockFn<MyFn>()

    configuredMock.calledWith(1).mockReturnValue('one')
    const result: string | undefined = configuredMock(1)

    expect(result).toBe('one')
  })

  test('infers argument and return types from an existing mock', () => {
    const existingMock = vi.fn((value: number) => value.toString())
    const configuredMock = mockFn(existingMock)

    configuredMock.calledWith(1).mockReturnValue('one')
    const result: string | undefined = configuredMock(1)

    expect(result).toBe('one')
    expect(configuredMock(2)).toBe('2')
  })
})
