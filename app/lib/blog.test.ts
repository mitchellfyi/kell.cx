import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { getAllPosts, getPostBySlug, getAllSlugs, BlogPost } from './blog'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    readdirSync: vi.fn(),
    readFileSync: vi.fn()
  },
  readdirSync: vi.fn(),
  readFileSync: vi.fn()
}))

describe('blog utilities', () => {
  const mockPostsDirectory = path.join(process.cwd(), 'content/blog')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllPosts', () => {
    it('should return all posts sorted by date (newest first)', () => {
      const mockFiles = ['post1.md', 'post2.md', 'not-markdown.txt']
      const mockPost1: BlogPost = {
        slug: 'post1',
        title: 'First Post',
        description: 'Description 1',
        date: '2024-01-01',
        content: 'Content 1'
      }
      const mockPost2: BlogPost = {
        slug: 'post2',
        title: 'Second Post',
        description: 'Description 2',
        date: '2024-01-02',
        content: 'Content 2'
      }

      vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any)
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(`---
title: ${mockPost1.title}
description: ${mockPost1.description}
date: ${mockPost1.date}
---
${mockPost1.content}`)
        .mockReturnValueOnce(`---
title: ${mockPost2.title}
description: ${mockPost2.description}
date: ${mockPost2.date}
---
${mockPost2.content}`)

      const posts = getAllPosts()

      expect(fs.readdirSync).toHaveBeenCalledWith(mockPostsDirectory)
      expect(posts).toHaveLength(2)
      expect(posts[0].slug).toBe('post2') // Newer post first
      expect(posts[1].slug).toBe('post1')
    })

    it('should handle empty directory', () => {
      vi.mocked(fs.readdirSync).mockReturnValue([])

      const posts = getAllPosts()

      expect(posts).toEqual([])
    })

    it('should filter out posts that fail to load', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['valid.md', 'invalid.md'] as any)
      vi.mocked(fs.readFileSync)
        .mockImplementationOnce(() => `---
title: Valid Post
description: Valid description
date: 2024-01-01
---
Content`)
        .mockImplementationOnce(() => {
          throw new Error('File read error')
        })

      const posts = getAllPosts()

      expect(posts).toHaveLength(1)
      expect(posts[0].slug).toBe('valid')
    })
  })

  describe('getPostBySlug', () => {
    it('should return a post by slug', () => {
      const mockContent = `---
title: Test Post
description: Test description
date: 2024-01-01
---
This is the post content.`

      vi.mocked(fs.readFileSync).mockReturnValue(mockContent)

      const post = getPostBySlug('test-post')

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockPostsDirectory, 'test-post.md'),
        'utf8'
      )
      expect(post).toEqual({
        slug: 'test-post',
        title: 'Test Post',
        description: 'Test description',
        date: '2024-01-01',
        content: 'This is the post content.'
      })
    })

    it('should return null if file does not exist', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      const post = getPostBySlug('non-existent')

      expect(post).toBeNull()
    })

    it('should handle malformed frontmatter gracefully', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('No frontmatter here')

      const post = getPostBySlug('malformed')

      // Should return null or handle gracefully based on gray-matter behavior
      expect(post).toMatchObject({
        slug: 'malformed',
        content: 'No frontmatter here'
      })
    })

    it('should handle empty content', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`---
title: Empty Post
description: No content
date: 2024-01-01
---`)

      const post = getPostBySlug('empty')

      expect(post).toEqual({
        slug: 'empty',
        title: 'Empty Post',
        description: 'No content',
        date: '2024-01-01',
        content: ''
      })
    })
  })

  describe('getAllSlugs', () => {
    it('should return all markdown file slugs', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['post1.md', 'post2.md', 'image.png'] as any)

      const slugs = getAllSlugs()

      expect(slugs).toEqual(['post1', 'post2'])
    })

    it('should handle empty directory', () => {
      vi.mocked(fs.readdirSync).mockReturnValue([])

      const slugs = getAllSlugs()

      expect(slugs).toEqual([])
    })

    it('should handle files with multiple dots', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['post.draft.md', 'post.v2.md'] as any)

      const slugs = getAllSlugs()

      expect(slugs).toEqual(['post.draft', 'post.v2'])
    })
  })
})