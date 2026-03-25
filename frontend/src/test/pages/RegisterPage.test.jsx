import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../utils'
import { server } from '../mocks/server'
import RegisterPage from '../../pages/RegisterPage'

describe('RegisterPage', () => {
  it('renders create account form', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows sign in link', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('registers user and stores credentials on success', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/username/i), 'newuser')
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true)
    })
  })

  it('shows username error from server', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/register/', () =>
        HttpResponse.json({ username: ['A user with that username already exists.'] }, { status: 400 })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/username/i), 'alice')
    await user.type(screen.getByLabelText(/email/i), 'a@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/username: a user with that username already exists/i)).toBeInTheDocument()
    })
  })

  it('shows generic error when server fails without field detail', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/register/', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/username/i), 'newuser')
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
    })
  })
})
