import { createSlice } from '@reduxjs/toolkit'

const access = localStorage.getItem('access')
const refresh = localStorage.getItem('refresh')
const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user,
    access,
    refresh,
    isAuthenticated: !!access,
  },
  reducers: {
    setCredentials(state, action) {
      const { user, access, refresh } = action.payload
      if (user !== undefined) state.user = user
      if (access !== undefined) state.access = access
      if (refresh !== undefined) state.refresh = refresh
      state.isAuthenticated = true
      if (user) localStorage.setItem('user', JSON.stringify(user))
      if (access) localStorage.setItem('access', access)
      if (refresh) localStorage.setItem('refresh', refresh)
    },
    logout(state) {
      state.user = null
      state.access = null
      state.refresh = null
      state.isAuthenticated = false
      localStorage.removeItem('user')
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
