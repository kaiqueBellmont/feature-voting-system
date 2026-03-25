import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import useAuth from '../hooks/useAuth'
import Navbar from '../components/Navbar'

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-600',
}

const FeatureDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [feature, setFeature] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`features/${id}/`)
      .then(({ data }) => setFeature(data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleVote = async () => {
    if (!feature) return
    try {
      if (feature.user_has_voted) {
        await api.delete(`features/${feature.id}/vote/`)
        setFeature({ ...feature, vote_count: feature.vote_count - 1, user_has_voted: false })
      } else {
        await api.post(`features/${feature.id}/vote/`)
        setFeature({ ...feature, vote_count: feature.vote_count + 1, user_has_voted: true })
      }
    } catch {
      // vote failed — no state change
    }
  }

  const isOwn = user?.id === feature?.author?.id
  const canVote = isAuthenticated && !isOwn
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`features/${feature.id}/`)
      navigate('/')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {loading && (
          <div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>
        )}

        {notFound && (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg mb-4">Feature not found.</p>
            <Link to="/" className="text-sm text-indigo-600 hover:underline">Back to list</Link>
          </div>
        )}

        {!loading && !notFound && feature && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">

            {/* Title + status */}
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`shrink-0 text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  feature.rank === 1 ? 'bg-yellow-400 text-white' :
                  feature.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  feature.rank === 3 ? 'bg-amber-600 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {feature.rank}
                </span>
                <h1 className="text-xl font-bold text-gray-900 leading-snug">{feature.title}</h1>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[feature.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {feature.status.replace('_', ' ')}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{feature.description}</p>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-6 pt-5 border-t border-gray-100 text-xs text-gray-400">
              <span>
                by <span className="font-medium text-gray-600">{feature.author.username}</span>
              </span>
              <span>{new Date(feature.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              {feature.updated_at !== feature.created_at && (
                <span>updated {new Date(feature.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              )}
            </div>

            {/* Vote + Delete */}
            <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
              <button
                onClick={() => canVote && handleVote()}
                disabled={!canVote}
                title={
                  !isAuthenticated ? 'Sign in to vote'
                  : isOwn ? 'You cannot vote on your own feature'
                  : feature.user_has_voted ? 'Remove vote'
                  : 'Upvote'
                }
                className={`group flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 active:scale-95 ${
                  feature.user_has_voted
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                    : canVote
                    ? 'border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-500 hover:bg-yellow-50'
                    : 'border-gray-100 text-gray-300 cursor-default'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 transition-all duration-200 ${
                    feature.user_has_voted
                      ? 'fill-yellow-400 stroke-yellow-400'
                      : canVote
                      ? 'fill-transparent stroke-current group-hover:fill-yellow-300 group-hover:stroke-yellow-400'
                      : 'fill-transparent stroke-current'
                  }`}
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {feature.vote_count} {feature.vote_count === 1 ? 'vote' : 'votes'}
              </button>

              {!isAuthenticated && (
                <p className="mt-2 text-xs text-gray-400">
                  <Link to="/login" className="text-indigo-500 hover:underline">Sign in</Link> to vote on this feature.
                </p>
              )}

              {isOwn && (
                <div className="flex items-center gap-2">
                  {confirmDelete ? (
                    <>
                      <span className="text-xs text-gray-500">Delete this feature?</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleting ? 'Deleting…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default FeatureDetailPage
