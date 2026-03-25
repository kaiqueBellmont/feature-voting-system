import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axios'
import { setNotifications, appendNotifications, markAllRead } from '../store/slices/notificationsSlice'
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextUrl, setNextUrl] = useState(null)
  const dropdownRef = useRef(null)
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) return
    api.get('notifications/').then(({ data }) => {
      dispatch(setNotifications(data.results ?? data))
      setNextUrl(data.next ?? null)
    }).catch(() => {})
  }, [isAuthenticated])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Infinite scroll inside dropdown
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !open) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextUrl && !loadingMore) {
          setLoadingMore(true)
          api.get(nextUrl).then(({ data }) => {
            dispatch(appendNotifications(data.results ?? []))
            setNextUrl(data.next ?? null)
          }).catch(() => {}).finally(() => setLoadingMore(false))
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, nextUrl, loadingMore])

  const handleMarkAllRead = async () => {
    try {
      await api.post('notifications/mark_all_read/')
      dispatch(markAllRead())
    } catch {}
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
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

          {/* Scrollable list */}
          <div className="overflow-y-auto max-h-80">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
            ) : (
              <>
                <ul>
                  {items.map((n) => (
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

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {loadingMore && (
                  <div className="flex justify-center py-3">
                    <svg className="w-4 h-4 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}

                {!nextUrl && !loadingMore && (
                  <p className="text-center text-xs text-gray-300 py-3">All caught up</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
