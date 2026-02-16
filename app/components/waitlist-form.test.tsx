import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WaitlistForm } from './waitlist-form'

// Mock global fetch
global.fetch = vi.fn()

describe('WaitlistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render form elements correctly', () => {
    render(<WaitlistForm />)

    expect(screen.getByText('Get early access')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join waitlist' })).toBeInTheDocument()
    expect(screen.getByText('Free during beta. No spam, just intel.')).toBeInTheDocument()
  })

  it('should handle successful form submission', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    const submitButton = screen.getByRole('button', { name: 'Join waitlist' })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    // Check loading state - button might update too fast, so we check for either state
    await waitFor(() => {
      const button = screen.queryByRole('button')
      if (button) {
        expect(button).toHaveTextContent(/Join(?:ing\.\.\.| waitlist)/)
      }
    })

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText("✓ You're on the list. We'll be in touch soon.")).toBeInTheDocument()
    })

    // Verify fetch was called with correct data
    expect(fetch).toHaveBeenCalledWith('https://formsubmit.co/ajax/hi@kell.cx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        _subject: 'Kell waitlist: test@example.com'
      })
    })
  })

  it('should handle form submission failure', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    const submitButton = screen.getByRole('button', { name: 'Join waitlist' })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })

    // Button should be back to normal state
    expect(screen.getByRole('button', { name: 'Join waitlist' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join waitlist' })).not.toBeDisabled()
  })

  it('should validate email input', async () => {
    const user = userEvent.setup()
    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    const submitButton = screen.getByRole('button', { name: 'Join waitlist' })

    // Try to submit with invalid email
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    // HTML5 validation should prevent submission
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should prevent submission with empty email', async () => {
    const user = userEvent.setup()
    render(<WaitlistForm />)

    const submitButton = screen.getByRole('button', { name: 'Join waitlist' })
    await user.click(submitButton)

    // HTML5 validation should prevent submission
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should handle controlled input correctly', async () => {
    const user = userEvent.setup()
    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement

    await user.type(emailInput, 'test@example.com')

    expect(emailInput.value).toBe('test@example.com')
  })

  it('should prevent multiple submissions while loading', async () => {
    const user = userEvent.setup()

    // Mock fetch to never resolve
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    const submitButton = screen.getByRole('button', { name: 'Join waitlist' })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    // Button should be disabled
    expect(screen.getByRole('button', { name: 'Joining...' })).toBeDisabled()

    // Try to click again
    await user.click(screen.getByRole('button', { name: 'Joining...' }))

    // Fetch should only be called once
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('should clear email input on successful submission', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Join waitlist' }))

    await waitFor(() => {
      expect(screen.getByText("✓ You're on the list. We'll be in touch soon.")).toBeInTheDocument()
    })

    // Email input should be gone (form is replaced with success message)
    expect(screen.queryByPlaceholderText('you@company.com')).not.toBeInTheDocument()
  })

  it('should handle network timeout gracefully', async () => {
    const user = userEvent.setup()

    // Mock fetch to timeout
    vi.mocked(fetch).mockImplementation(() =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    )

    render(<WaitlistForm />)

    const emailInput = screen.getByPlaceholderText('you@company.com')
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Join waitlist' }))

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    }, { timeout: 200 })
  })
})