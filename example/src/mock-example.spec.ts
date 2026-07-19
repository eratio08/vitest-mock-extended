import { describe, expect, it, vi } from 'vitest'
import { isMockObject, mock, mockDeep, mockFn } from 'vitest-mock-extended'

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

  it('should add calledWith behavior to an existing Vitest mock', () => {
    const existingMock = vi.fn((value: string) => value.length > 0)
    const configuredMock = mockFn(existingMock)

    configuredMock.calledWith('value').mockReturnValue(false)

    expect(configuredMock).toBe(existingMock)
    expect(configuredMock('value')).toBe(false)
    expect(configuredMock('other')).toBe(true)
  })
})
