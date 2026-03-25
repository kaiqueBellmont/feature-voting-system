import { describe, it, expect, beforeEach, vi } from 'vitest'
import authReducer, { setCredentials, logout } from '../../store/slices/authSlice'

const INITIAL_STATE = { user: null, access: null, refresh: null, isAuthenticated: false }

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('has correct initial state when localStorage is empty', () => {
    const state = authReducer(undefined, { type: '@@INIT' })
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.access).toBeNull()
  })

  describe('setCredentials', () => {
    it('sets user, access and refresh and marks authenticated', () => {
      const state = authReducer(INITIAL_STATE, setCredentials({
        user: { id: 1, username: 'alice' },
        access: 'tok',
        refresh: 'ref',
      }))

      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual({ id: 1, username: 'alice' })
      expect(state.access).toBe('tok')
      expect(state.refresh).toBe('ref')
    })

    it('persists tokens to localStorage', () => {
      authReducer(INITIAL_STATE, setCredentials({ user: { id: 1, username: 'alice' }, access: 'tok', refresh: 'ref' }))

      expect(localStorage.getItem('access')).toBe('tok')
      expect(localStorage.getItem('refresh')).toBe('ref')
      expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, username: 'alice' })
    })

    it('updates only access when only access is provided', () => {
      const prev = { user: { id: 1, username: 'alice' }, access: 'old', refresh: 'ref', isAuthenticated: true }
      const state = authReducer(prev, setCredentials({ access: 'new' }))

      expect(state.access).toBe('new')
      expect(state.user).toEqual({ id: 1, username: 'alice' })
      expect(state.refresh).toBe('ref')
    })
  })

  describe('logout', () => {
    it('clears all auth state', () => {
      const loggedIn = { user: { id: 1, username: 'alice' }, access: 'tok', refresh: 'ref', isAuthenticated: true }
      const state = authReducer(loggedIn, logout())

      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.access).toBeNull()
      expect(state.refresh).toBeNull()
    })

    it('removes tokens from localStorage', () => {
      localStorage.setItem('access', 'tok')
      localStorage.setItem('refresh', 'ref')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      authReducer(undefined, logout())

      expect(localStorage.getItem('access')).toBeNull()
      expect(localStorage.getItem('refresh')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })
})
