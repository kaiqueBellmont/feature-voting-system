import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axios'
import { setNotifications, markAllRead } from '../store/slices/notificationsSlice'
import useAuth from '../hooks/useAuth'

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const NotificationBell = () => {
  const dispatch = useDispatch()
  const { items, unreadCount } = useSelector((state) => state.notifications)
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) return
    api.get('notifications/').then(({ data }) => {
      dispatch(setNotifications(data.results ?? data))
    }).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.post('notifications/mark_all_read/')
      dispatch(markAllRead())
    } catch {}
  }

  const preview = items.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {preview.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
          ) : (
            <ul>
              {preview.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-indigo-50/50' : ''}`}
                >
                  <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400 truncate max-w-[180px]">{n.feature_title}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(n.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
