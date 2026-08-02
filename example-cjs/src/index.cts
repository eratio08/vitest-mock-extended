import { type MockProxy, mock } from 'vitest-mock-extended'

type Service = {
  get(): string
}

const service: MockProxy<Service> = mock<Service>()
service.get.mockReturnValue('ok')
