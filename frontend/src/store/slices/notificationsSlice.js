import { createSlice } from '@reduxjs/toolkit'

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    connected: false,
  },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload
      state.unreadCount = action.payload.filter(n => !n.is_read).length
    },
    addNotification(state, action) {
      state.items.unshift(action.payload)
      if (!action.payload.is_read) state.unreadCount += 1
    },
    markRead(state, action) {
      const item = state.items.find(n => n.id === action.payload)
      if (item && !item.is_read) {
        item.is_read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead(state) {
      state.items.forEach(n => { n.is_read = true })
      state.unreadCount = 0
    },
    setConnected(state, action) {
      state.connected = action.payload
    },
  },
})

export const { setNotifications, addNotification, markRead, markAllRead, setConnected } =
  notificationsSlice.actions
export default notificationsSlice.reducer
