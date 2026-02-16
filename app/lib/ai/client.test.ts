import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateCompletion,
  generateJSON,
  isAIAvailable,
  getAIConfig,
  AILogger,
  AIConfig
} from './client'

// Create mock create function outside of module scope
const mockCreate = vi.fn()

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate
        }
      }
    }
  }
})

describe('AI client', () => {
  const originalEnv = process.env
  const mockLogger: AILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OPENAI_API_KEY = 'test-api-key'
    process.env.OPENAI_MODEL = 'gpt-4o'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('generateCompletion', () => {
    it('should generate completion successfully', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Generated response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateCompletion('Test prompt', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Generated response')
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        estimatedCost: expect.any(Number)
      })
      expect(result.latencyMs).toBeDefined()
    })

    it('should use custom config parameters', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const config: AIConfig = {
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.5
      }

      await generateCompletion('Test', config, mockLogger)

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1000,
        temperature: 0.5
      })
    })

    it('should handle reasoning models differently', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Reasoning response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await generateCompletion('Test', { model: 'o1-mini' }, mockLogger)

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'o1-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_completion_tokens: 2000
      })
    })

    it('should return error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY

      const result = await generateCompletion('Test', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('OpenAI client not configured')
    })

    it('should retry on rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      const mockResponse = {
        choices: [{ message: { content: 'Success after retry' } }]
      }

      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockResponse)

      const result = await generateCompletion('Test', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Success after retry')
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retry 1/3'),
        expect.any(Object)
      )
    })

    it('should fail after max retries', async () => {
      const error = new Error('rate limit exceeded')

      mockCreate
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)

      const result = await generateCompletion('Test', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit exceeded')
      expect(mockCreate).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Invalid API key')

      mockCreate.mockRejectedValueOnce(error)

      const result = await generateCompletion('Test', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid API key')
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should calculate costs correctly for different models', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 2000,
          total_tokens: 3000
        }
      }

      mockCreate.mockResolvedValue(mockResponse)

      // Test GPT-4o
      let result = await generateCompletion('Test', { model: 'gpt-4o' }, mockLogger)
      expect(result.usage?.estimatedCost).toBeCloseTo(0.0225, 4) // (1000 * 2.50 + 2000 * 10.00) / 1_000_000

      // Test GPT-3.5-turbo
      result = await generateCompletion('Test', { model: 'gpt-3.5-turbo' }, mockLogger)
      expect(result.usage?.estimatedCost).toBeCloseTo(0.0035, 4) // (1000 * 0.50 + 2000 * 1.50) / 1_000_000
    })

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }]
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateCompletion('Test', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toBe('')
    })
  })

  describe('generateJSON', () => {
    it('should parse valid JSON response', async () => {
      const jsonData = { name: 'Test', value: 42 }
      const mockResponse = {
        choices: [{
          message: { content: JSON.stringify(jsonData) },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateJSON<typeof jsonData>('Generate JSON', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(jsonData)
    })

    it('should clean markdown code blocks', async () => {
      const jsonData = { test: true }
      const mockResponse = {
        choices: [{
          message: { content: '```json\n' + JSON.stringify(jsonData) + '\n```' }
        }]
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateJSON<typeof jsonData>('Generate', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(jsonData)
    })

    it('should handle parse errors', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'This is not JSON' }
        }]
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateJSON('Generate', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to parse AI response as JSON')
    })

    it('should handle empty response', async () => {
      const mockResponse = {
        choices: [{
          message: { content: '```json\n\n```' }
        }]
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateJSON('Generate', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('AI returned empty response')
    })

    it('should propagate completion errors', async () => {
      delete process.env.OPENAI_API_KEY

      const result = await generateJSON('Test', {}, mockLogger)

      expect(result.success).toBe(false)
      expect(result.error).toContain('OpenAI client not configured')
    })

    it('should include usage data when available', async () => {
      const jsonData = { success: true }
      const mockResponse = {
        choices: [{
          message: { content: JSON.stringify(jsonData) }
        }],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40
        }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await generateJSON<typeof jsonData>('Generate', {}, mockLogger)

      expect(result.success).toBe(true)
      expect(result.usage).toBeDefined()
      expect(result.usage?.totalTokens).toBe(40)
    })
  })

  describe('isAIAvailable', () => {
    it('should return true when API key is set', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      expect(isAIAvailable()).toBe(true)
    })

    it('should return false when API key is not set', () => {
      delete process.env.OPENAI_API_KEY
      expect(isAIAvailable()).toBe(false)
    })

    it('should return false when API key is empty string', () => {
      process.env.OPENAI_API_KEY = ''
      expect(isAIAvailable()).toBe(false)
    })
  })

  describe('getAIConfig', () => {
    it('should return current configuration', () => {
      process.env.OPENAI_MODEL = 'gpt-4-turbo'
      process.env.OPENAI_API_KEY = 'test-key'

      const config = getAIConfig()

      expect(config.model).toBe('gpt-4-turbo')
      expect(config.available).toBe(true)
    })

    it('should use default model when not specified', () => {
      delete process.env.OPENAI_MODEL
      process.env.OPENAI_API_KEY = 'test-key'

      const config = getAIConfig()

      expect(config.model).toBe('gpt-4o')
      expect(config.available).toBe(true)
    })

    it('should indicate unavailable when no API key', () => {
      delete process.env.OPENAI_API_KEY

      const config = getAIConfig()

      expect(config.available).toBe(false)
    })
  })

  describe('logging behavior', () => {
    it('should log completion success with usage info', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await generateCompletion('Test', {}, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completion success',
        expect.objectContaining({
          model: 'gpt-4o',
          tokens: 300,
          cost: expect.stringMatching(/^\$\d+\.\d{4}$/),
          latencyMs: expect.any(Number)
        })
      )
    })

    it('should log errors with details', async () => {
      const error = new Error('API Error')
      mockCreate.mockRejectedValueOnce(error)

      await generateCompletion('Test', {}, mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Completion failed',
        expect.objectContaining({
          error: 'API Error',
          latencyMs: expect.any(Number)
        })
      )
    })

    it('should only log debug when AI_DEBUG is true', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      process.env.AI_DEBUG = 'false'

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }]
      }
      mockCreate.mockResolvedValueOnce(mockResponse)

      await generateCompletion('Test')

      // Debug logs should not be called when AI_DEBUG is false
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[AI:DEBUG]'),
        expect.any(String)
      )

      // Enable debug and try again
      process.env.AI_DEBUG = 'true'
      await generateCompletion('Test')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AI:DEBUG]'),
        expect.any(Object)
      )

      consoleLogSpy.mockRestore()
    })
  })
})