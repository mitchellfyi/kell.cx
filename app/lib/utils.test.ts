import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-2 py-1', 'p-3')
    expect(result).toBe('p-3')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('should handle falsy values', () => {
    const result = cn('base', false && 'active', null, undefined, '')
    expect(result).toBe('base')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['text-sm', 'font-medium'], 'text-lg')
    expect(result).toBe('font-medium text-lg')
  })

  it('should handle object syntax', () => {
    const result = cn('base', {
      'text-red-500': true,
      'text-blue-500': false,
    })
    expect(result).toBe('base text-red-500')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should merge tailwind classes correctly', () => {
    const result = cn('text-red-500 hover:text-red-600', 'text-blue-500')
    // twMerge preserves hover state but replaces base text color
    expect(result).toBe('hover:text-red-600 text-blue-500')
  })

  it('should handle complex merging scenarios', () => {
    const result = cn(
      'px-2 py-1 text-sm',
      'p-4',
      'text-lg font-bold'
    )
    expect(result).toBe('p-4 text-lg font-bold')
  })
})