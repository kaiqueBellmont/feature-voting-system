import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../utils'
import { server } from '../mocks/server'
import LoginPage from '../../pages/LoginPage'

describe('LoginPage', () => {
  it('renders sign in form', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows register link', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('submits credentials and stores tokens on success', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true)
      expect(store.getState().auth.access).toBe('access-token')
    })
  })

  it('shows error message on invalid credentials', async () => {
    server.use(
      http.post('http://localhost:8000/api/token/', () =>
        HttpResponse.json({ detail: 'No active account found' }, { status: 401 })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/username/i), 'wrong')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    let resolve
    server.use(
      http.post('http://localhost:8000/api/token/', () =>
        new Promise((res) => { resolve = res })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    resolve(HttpResponse.json({ access: 'tok', refresh: 'ref' }))
  })
})
