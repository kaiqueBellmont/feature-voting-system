import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addNotification, setConnected } from '../store/slices/notificationsSlice'

const useWebSocket = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, access } = useSelector((state) => state.auth)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !access) {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      dispatch(setConnected(false))
      return
    }

    let stopped = false

    const connect = () => {
      if (stopped) return

      const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${access}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (!stopped) dispatch(setConnected(true))
      }

      ws.onmessage = (e) => {
        if (stopped) return
        try {
          const data = JSON.parse(e.data)
          dispatch(addNotification(data))
        } catch {}
      }

      ws.onclose = () => {
        if (stopped) return
        dispatch(setConnected(false))
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      dispatch(setConnected(false))
    }
  }, [isAuthenticated, access])
}

export default useWebSocket
