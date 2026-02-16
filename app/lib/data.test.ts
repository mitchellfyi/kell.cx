import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getVSCodeStats,
  getGitHubReleases,
  getHNMentions,
  getLatestNews,
  getAiderBenchmark,
  getLMArenaLeaderboard,
  getMeta,
  getDashboardStats,
  getAIInsights,
  getHNSummaries,
  getMarketAnalysis,
  getGeneratedContent,
  sources
} from './data'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn()
  },
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}))

describe('data utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getVSCodeStats', () => {
    it('should return vscode stats when file exists', () => {
      const mockData = {
        generatedAt: '2024-01-01T00:00:00Z',
        totalInstalls: 1000000,
        extensions: [
          {
            id: 'ext1',
            name: 'Extension 1',
            publisher: 'Publisher 1',
            installs: 500000,
            averageRating: 4.5
          }
        ]
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getVSCodeStats()

      expect(result).toEqual(mockData)
    })

    it('should return default values when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getVSCodeStats()

      expect(result.totalInstalls).toBe(0)
      expect(result.extensions).toEqual([])
      expect(result.generatedAt).toBeDefined()
    })

    it('should handle JSON parse errors', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const result = getVSCodeStats()

      expect(result.totalInstalls).toBe(0)
      expect(result.extensions).toEqual([])
    })
  })

  describe('getGitHubReleases', () => {
    it('should return GitHub releases when file exists', () => {
      const mockData = {
        generatedAt: '2024-01-01T00:00:00Z',
        recentReleases: [
          {
            repo: 'company/repo',
            company: 'Company',
            name: 'v1.0.0',
            tag: 'v1.0.0',
            url: 'https://github.com/company/repo/releases/tag/v1.0.0',
            publishedAt: '2024-01-01T00:00:00Z',
            isPrerelease: false
          }
        ],
        reposTracked: 10
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getGitHubReleases()

      expect(result).toEqual(mockData)
    })

    it('should return default values when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getGitHubReleases()

      expect(result.recentReleases).toEqual([])
      expect(result.generatedAt).toBeDefined()
    })
  })

  describe('getHNMentions', () => {
    it('should return HN mentions when file exists', () => {
      const mockData = {
        generatedAt: '2024-01-01T00:00:00Z',
        stories: [
          {
            id: '123',
            title: 'AI Tools Discussion',
            url: 'https://example.com',
            author: 'user123',
            points: 100,
            comments: 50,
            createdAt: '2024-01-01T00:00:00Z',
            hnUrl: 'https://news.ycombinator.com/item?id=123'
          }
        ]
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getHNMentions()

      expect(result).toEqual(mockData)
    })

    it('should handle empty stories array', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getHNMentions()

      expect(result.stories).toEqual([])
    })
  })

  describe('getDashboardStats', () => {
    it('should compute dashboard statistics correctly', () => {
      const mockVSCodeData = {
        generatedAt: '2024-01-01T00:00:00Z',
        totalInstalls: 2500000,
        extensions: []
      }

      const mockReleasesData = {
        generatedAt: '2024-01-01T00:00:00Z',
        recentReleases: [
          {
            repo: 'test/repo1',
            company: 'Test',
            name: 'v1.0.0',
            tag: 'v1.0.0',
            url: 'https://example.com',
            publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            isPrerelease: false
          },
          {
            repo: 'test/repo2',
            company: 'Test',
            name: 'v2.0.0',
            tag: 'v2.0.0',
            url: 'https://example.com',
            publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            isPrerelease: false
          }
        ]
      }

      const mockHNData = {
        generatedAt: '2024-01-01T00:00:00Z',
        stories: [
          {
            id: '1',
            title: 'Story 1',
            url: '',
            author: 'user1',
            points: 100,
            comments: 10,
            createdAt: '',
            hnUrl: ''
          },
          {
            id: '2',
            title: 'Story 2',
            url: '',
            author: 'user2',
            points: 50,
            comments: 5,
            createdAt: '',
            hnUrl: ''
          }
        ]
      }

      const mockMeta = {
        lastRefresh: '2024-01-01T00:00:00Z',
        toolsTracked: 20
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(mockVSCodeData))
        .mockReturnValueOnce(JSON.stringify(mockReleasesData))
        .mockReturnValueOnce(JSON.stringify(mockHNData))
        .mockReturnValueOnce(JSON.stringify(mockMeta))

      const result = getDashboardStats()

      expect(result.toolsTracked).toBe(20)
      expect(result.vscodeInstalls).toBe(2500000)
      expect(result.vscodeInstallsFormatted).toBe('3M+')
      expect(result.releasesThisWeek).toBe(1) // Only one release within 7 days
      expect(result.hnMentions).toBe(2)
      expect(result.hnPoints).toBe(150)
      expect(result.sources).toEqual(sources)
    })

    it('should format large numbers correctly', () => {
      const testCases = [
        { installs: 999, expected: '999' },
        { installs: 1000, expected: '1K+' },
        { installs: 1500, expected: '2K+' },
        { installs: 999999, expected: '1000K+' },
        { installs: 1000000, expected: '1M+' },
        { installs: 1500000, expected: '2M+' },
        { installs: 1000000000, expected: '1.0B' },
        { installs: 2500000000, expected: '2.5B' }
      ]

      testCases.forEach(({ installs, expected }) => {
        const mockData = {
          generatedAt: new Date().toISOString(),
          totalInstalls: installs,
          extensions: []
        }

        vi.mocked(existsSync).mockReturnValue(true)
        vi.mocked(readFileSync)
          .mockReturnValueOnce(JSON.stringify(mockData))
          .mockReturnValueOnce(JSON.stringify({ generatedAt: '', recentReleases: [] }))
          .mockReturnValueOnce(JSON.stringify({ generatedAt: '', stories: [] }))
          .mockReturnValueOnce(JSON.stringify({ lastRefresh: new Date().toISOString(), toolsTracked: 15 }))

        const result = getDashboardStats()
        expect(result.vscodeInstallsFormatted).toBe(expected)
      })
    })
  })

  describe('getAIInsights', () => {
    it('should return AI insights when file exists', () => {
      const mockData = {
        date: '2024-01-01',
        insights: [
          {
            headline: 'New AI Model Released',
            summary: 'Summary of the insight',
            significance: 'high' as const,
            sources: ['source1', 'source2'],
            category: 'releases'
          }
        ],
        marketSummary: 'Overall market summary',
        generatedAt: '2024-01-01T00:00:00Z'
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getAIInsights()

      expect(result).toEqual(mockData)
    })

    it('should return null when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getAIInsights()

      expect(result).toBeNull()
    })
  })

  describe('getHNSummaries', () => {
    it('should return HN summaries when file exists', () => {
      const mockData = {
        generatedAt: '2024-01-01T00:00:00Z',
        summaryCount: 2,
        summaries: [
          {
            storyId: '123',
            title: 'AI Discussion',
            summary: 'Summary of discussion',
            sentiment: 'positive' as const,
            keyPoints: ['point1', 'point2'],
            toolsMentioned: ['tool1', 'tool2'],
            competitiveImplication: 'Implication text',
            generatedAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getHNSummaries()

      expect(result).toEqual(mockData)
    })

    it('should return null when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getHNSummaries()

      expect(result).toBeNull()
    })
  })

  describe('getMeta', () => {
    it('should return meta information with formatted date', () => {
      const mockData = {
        lastRefresh: '2024-01-01T12:00:00Z',
        toolsTracked: 25
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getMeta()

      expect(result.lastRefresh).toBe(mockData.lastRefresh)
      expect(result.toolsTracked).toBe(mockData.toolsTracked)
      expect(result.lastRefreshFormatted).toBeDefined()
      expect(result.lastRefreshFormatted).toMatch(/\w{3} \d{1,2}, \d{4}/)
    })

    it('should handle default values', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = getMeta()

      expect(result.toolsTracked).toBe(15)
      expect(result.lastRefreshFormatted).toBeDefined()
    })
  })

  describe('source links', () => {
    it('should export correct source links', () => {
      expect(sources.vscode).toBe('https://marketplace.visualstudio.com/')
      expect(sources.github).toBe('https://github.com/')
      expect(sources.hn).toBe('https://news.ycombinator.com/')
      expect(sources.aider).toBe('https://aider.chat/docs/leaderboards/')
      expect(sources.lmarena).toBe('https://lmarena.ai/')
      expect(sources.npm).toBe('https://www.npmjs.com/')
      expect(sources.pypi).toBe('https://pypi.org/')
    })
  })

  describe('edge cases', () => {
    it('should handle file in multiple locations', () => {
      const mockData = { test: 'data' }

      vi.mocked(existsSync)
        .mockReturnValueOnce(false) // ROOT_DATA path
        .mockReturnValueOnce(true)  // SITE_DATA path
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = getLatestNews()

      expect(existsSync).toHaveBeenCalledTimes(2)
    })

    it('should handle corrupted JSON in first file', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync)
        .mockReturnValueOnce('invalid json')
        .mockReturnValueOnce(JSON.stringify({ items: [], generatedAt: '2024-01-01' }))

      const result = getLatestNews()

      expect(result.items).toEqual([])
    })
  })
})