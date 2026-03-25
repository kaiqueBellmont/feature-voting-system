import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { setFeatures, updateFeature, addFeature } from '../store/slices/featuresSlice'
import { logout } from '../store/slices/authSlice'
import useFeatures from '../hooks/useFeatures'
import useAuth from '../hooks/useAuth'

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-600',
}

const EMPTY_FORM = { title: '', description: '' }

const FeaturesPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { features, loading, error } = useFeatures()
  const { isAuthenticated, user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleLogout = async () => {
    await api.post('auth/logout/').catch(() => {})
    dispatch(logout())
    navigate('/login')
  }

  useEffect(() => {
    api.get('features/').then(({ data }) => dispatch(setFeatures(data)))
  }, [dispatch])

  const handleVote = async (feature) => {
    try {
      if (feature.user_has_voted) {
        await api.delete(`features/${feature.id}/vote/`)
        dispatch(updateFeature({ ...feature, vote_count: feature.vote_count - 1, user_has_voted: false }))
      } else {
        await api.post(`features/${feature.id}/vote/`)
        dispatch(updateFeature({ ...feature, vote_count: feature.vote_count + 1, user_has_voted: true }))
      }
    } catch {
      // vote failed — no state change
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post('features/', form)
      dispatch(addFeature({ ...data, vote_count: 0, user_has_voted: false }))
      setForm(EMPTY_FORM)
      setShowModal(false)
    } catch (err) {
      const detail = err.response?.data
      setFormError(detail?.title?.[0] ?? detail?.description?.[0] ?? 'Failed to create feature.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Failed to load features.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Feature Voting</span>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-500">
                  Signed in as <span className="font-medium text-gray-700">{user?.username}</span>
                </span>
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

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Page title + New Feature button */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Feature Requests</h1>
          {isAuthenticated && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span className="text-base leading-none">+</span>
              New Feature
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-8">
          {features.length} {features.length === 1 ? 'request' : 'requests'} · sorted by votes
        </p>

        {/* Feature list */}
        {features.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No feature requests yet.</p>
        ) : (
          <ul className="space-y-4">
            {features.map((feature) => {
              const isOwn = user?.id === feature.author.id
              const canVote = isAuthenticated && !isOwn

              return (
                <li key={feature.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-gray-900 leading-snug">{feature.title}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[feature.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {feature.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{feature.description}</p>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">
                      by <span className="font-medium text-gray-500">{feature.author.username}</span>
                    </p>
                    <button
                      onClick={() => canVote && handleVote(feature)}
                      disabled={!canVote}
                      title={
                        !isAuthenticated ? 'Sign in to vote'
                        : isOwn ? 'You cannot vote on your own feature'
                        : feature.user_has_voted ? 'Remove vote'
                        : 'Upvote'
                      }
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 active:scale-95 ${
                        feature.user_has_voted
                          ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                          : canVote
                          ? 'border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50'
                          : 'border-gray-100 text-gray-300 cursor-default'
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-3.5 h-3.5 transition-all duration-200 ${
                          feature.user_has_voted
                            ? 'fill-yellow-400 stroke-yellow-400'
                            : canVote
                            ? 'fill-transparent stroke-current group-hover:fill-yellow-300 group-hover:stroke-yellow-400'
                            : 'fill-transparent stroke-current'
                        }`}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {feature.vote_count}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Create Feature Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Feature Request</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Short, descriptive title"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain the feature and why it's valuable…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default FeaturesPage
