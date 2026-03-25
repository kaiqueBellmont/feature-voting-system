import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import api from '../api/axios'
import { logout } from '../store/slices/authSlice'
import useAuth from '../hooks/useAuth'
import NotificationBell from './NotificationBell'

const Navbar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const handleLogout = async () => {
    await api.post('auth/logout/').catch(() => {})
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
          Feature Voting
        </Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-500">
                Signed in as <span className="font-medium text-gray-700">{user?.username}</span>
              </span>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sign in</Link>
              <Link to="/register" className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
