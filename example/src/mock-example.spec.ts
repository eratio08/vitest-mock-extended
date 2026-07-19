import { describe, expect, it, vi } from 'vitest'
import { type DeepMockProxy, isMockObject, mock, mockDeep, mockFn } from 'vitest-mock-extended'

class ExampleClass {
  method1() {
    return 'test'
  }
}

describe('Use mock example', () => {
  type SomeType = { fieldC: string }
  interface SomeInterface {
    fieldA: string
    fieldB: SomeType
  }

  it('should mock interfaces and types', () => {
    const mockedInterface = mock<SomeInterface>({ fieldA: 'valueA', fieldB: { fieldC: 'valueC' } })

    expect(mockedInterface.fieldA).toBe('valueA')
    expect(mockedInterface.fieldB).contains({ fieldC: 'valueC' })
  })

  it('should mock returned object', () => {
    const mockedInterface = mockDeep<SomeInterface>({ fieldA: 'valueA' })

    expect(mockedInterface.fieldA).toBe('valueA')
    expect(mockedInterface.fieldB.fieldC).not.toBeNull() // returns spy function
  })

  it('should identify mock objects', () => {
    const mockedInterface = mock<SomeInterface>()

    expect(isMockObject(mockedInterface)).toBe(true)
    expect(isMockObject({})).toBe(false)
  })

  it('should match object arguments with objectContaining', async () => {
    type Repository = {
      create: (args: { data: SomeType }) => Promise<SomeType>
    }
    const repository = mockDeep<Repository>()
    const value = { fieldC: 'valueC' }

    repository.create.calledWith(expect.objectContaining({ data: value })).mockResolvedValue(value)

    expect(await repository.create({ data: value })).toBe(value)
  })

  it('should spy on a deep mock after accessing the method', () => {
    const deepMockedClass: ExampleClass = mockDeep<ExampleClass>()
    deepMockedClass.method1
    const spy = vi.spyOn(deepMockedClass, 'method1')

    deepMockedClass.method1()

    expect(spy).toHaveBeenCalled()
  })

  it('should spy on a deep mock created from an instance', () => {
    const deepMockedClass: ExampleClass = mockDeep(new ExampleClass())
    const spy = vi.spyOn(deepMockedClass, 'method1')

    deepMockedClass.method1()

    expect(spy).toHaveBeenCalled()
  })

  it('should spy on an instance without mocking it', () => {
    const instance = new ExampleClass()
    const spy = vi.spyOn(instance, 'method1')

    instance.method1()

    expect(spy).toHaveBeenCalled()
  })

  it('should spy on a deep mock created from an implementation', () => {
    const deepMockedClass: ExampleClass = mockDeep({ method1: () => 'test' })
    const spy = vi.spyOn(deepMockedClass, 'method1')

    deepMockedClass.method1()

    expect(spy).toHaveBeenCalled()
  })

  it('should configure a deep mock through its typed proxy', () => {
    const deepMockedClass: DeepMockProxy<ExampleClass> = mockDeep<ExampleClass>()
    deepMockedClass.method1.mockReturnValue('test2')

    expect(deepMockedClass.method1()).toBe('test2')
  })

  it('should add calledWith behavior to an existing Vitest mock', () => {
    const existingMock = vi.fn((value: string) => value.length > 0)
    const configuredMock = mockFn(existingMock)

    configuredMock.calledWith('value').mockReturnValue(false)

    expect(configuredMock).toBe(existingMock)
    expect(configuredMock('value')).toBe(false)
    expect(configuredMock('other')).toBe(true)
  })
})
