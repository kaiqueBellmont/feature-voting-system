import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import api from '../api/axios'
import { setFeatures, setCurrentPage, updateFeature, addFeature, PAGE_SIZE } from '../store/slices/featuresSlice'
import useFeatures from '../hooks/useFeatures'
import useAuth from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import FeatureCard from '../components/FeatureCard'

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
  const [voteError, setVoteError] = useState(null)

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

  const handleOrderingChange = (value) => {
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
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.headers['retry-after']
        const seconds = retryAfter ? parseInt(retryAfter, 10) : 3600
        const wait = seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.ceil(seconds / 60)} minutes` : `${Math.ceil(seconds / 3600)} hours`
        setVoteError(`Vote limit reached. Try again in ${wait}.`)
        setTimeout(() => setVoteError(null), 5000)
      }
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

      {voteError && (
        <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl shadow-md pointer-events-auto">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-red-400" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {voteError}
            <button onClick={() => setVoteError(null)} className="ml-1 text-red-400 hover:text-red-600 transition-colors">✕</button>
          </div>
        </div>
      )}

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

        {/* Search */}
        <div className="relative mb-3">
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
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus:border-transparent transition"
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

        {/* Ordering pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { value: '-vote_count', label: 'Most voted' },
            { value: 'vote_count',  label: 'Least voted' },
            { value: '-created_at', label: 'Newest' },
            { value: 'created_at',  label: 'Oldest' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleOrderingChange(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                ordering === value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {label}
            </button>
          ))}
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
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  canVote={canVote}
                  isOwn={isOwn}
                  onVote={handleVote}
                />
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
