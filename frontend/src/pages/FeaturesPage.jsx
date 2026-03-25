import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link as RouterLink } from 'react-router-dom'
import api from '../api/axios'
import { setFeatures, setCurrentPage, updateFeature, addFeature, PAGE_SIZE } from '../store/slices/featuresSlice'
import useFeatures from '../hooks/useFeatures'
import useAuth from '../hooks/useAuth'
import Navbar from '../components/Navbar'

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
  const { features, count, currentPage, loading, error } = useFeatures()
  const { isAuthenticated, user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-vote_count')

  const debounceRef = useRef(null)
  const totalPages = Math.ceil(count / PAGE_SIZE)

  const fetchPage = (page, searchQuery = search, orderingValue = ordering) => {
    dispatch(setCurrentPage(page))
    const params = new URLSearchParams({ page, ordering: orderingValue })
    if (searchQuery) params.set('search', searchQuery)
    api.get(`features/?${params}`).then(({ data }) => dispatch(setFeatures(data)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    fetchPage(1)
  }, [])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPage(1, value)
    }, 400)
  }

  const handleOrderingChange = (e) => {
    const value = e.target.value
    setOrdering(value)
    fetchPage(1, search, value)
  }

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

  // Build page numbers with ellipsis: [1] ... [4] [5] [6] ... [12]
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Failed to load features.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

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
        <p className="text-sm text-gray-500 mb-6">
          {count} {count === 1 ? 'request' : 'requests'}
        </p>

        {/* Search + Ordering */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by title or description…"
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); fetchPage(1, '') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={ordering}
            onChange={handleOrderingChange}
            className="text-sm border border-gray-200 rounded-xl bg-white shadow-sm px-3 py-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition cursor-pointer"
          >
            <option value="-vote_count">Most voted</option>
            <option value="vote_count">Least voted</option>
            <option value="-created_at">Newest</option>
            <option value="created_at">Oldest</option>
          </select>
        </div>

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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        feature.rank === 1 ? 'bg-yellow-400 text-white' :
                        feature.rank === 2 ? 'bg-gray-300 text-gray-700' :
                        feature.rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {feature.rank}
                      </span>
                      <RouterLink
                        to={`/features/${feature.id}`}
                        className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug"
                      >
                        {feature.title}
                      </RouterLink>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[feature.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {feature.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{feature.description}</p>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">
                      by <span className="font-medium text-gray-500">{feature.author.username}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
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

                    <RouterLink
                      to={`/features/${feature.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all duration-200"
                      title="View details"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </RouterLink>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-10">
            <button
              onClick={() => fetchPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              ←
            </button>

            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => fetchPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => fetchPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              →
            </button>
          </div>
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
