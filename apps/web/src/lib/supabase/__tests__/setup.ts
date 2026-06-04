import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

expect.extend({
  // custom matchers can go here if needed
})

afterEach(() => {
  cleanup()
})