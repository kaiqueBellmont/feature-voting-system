import { describe, it, expect } from 'vitest'
import featuresReducer, {
  setFeatures,
  setCurrentPage,
  addFeature,
  appendFeatures,
  updateFeature,
  setLoading,
  setError,
} from '../../store/slices/featuresSlice'

const FEATURE = { id: 1, title: 'Dark mode', vote_count: 5, user_has_voted: false }
const INITIAL_STATE = { features: [], count: 0, currentPage: 1, loading: false, error: null }

describe('featuresSlice', () => {
  it('has correct initial state', () => {
    const state = featuresReducer(undefined, { type: '@@INIT' })
    expect(state).toEqual(INITIAL_STATE)
  })

  describe('setFeatures', () => {
    it('replaces features list and count', () => {
      const state = featuresReducer(INITIAL_STATE, setFeatures({
        results: [FEATURE],
        count: 1,
      }))

      expect(state.features).toEqual([FEATURE])
      expect(state.count).toBe(1)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setCurrentPage', () => {
    it('updates currentPage', () => {
      const state = featuresReducer(INITIAL_STATE, setCurrentPage(3))
      expect(state.currentPage).toBe(3)
    })
  })

  describe('addFeature', () => {
    it('prepends new feature and increments count', () => {
      const prev = { ...INITIAL_STATE, features: [FEATURE], count: 1 }
      const newFeature = { id: 2, title: 'Mobile app', vote_count: 0, user_has_voted: false }
      const state = featuresReducer(prev, addFeature(newFeature))

      expect(state.features[0]).toEqual(newFeature)
      expect(state.features).toHaveLength(2)
      expect(state.count).toBe(2)
    })
  })

  describe('appendFeatures', () => {
    it('appends features to existing list', () => {
      const prev = { ...INITIAL_STATE, features: [FEATURE] }
      const extra = { id: 2, title: 'Mobile app', vote_count: 0, user_has_voted: false }
      const state = featuresReducer(prev, appendFeatures([extra]))

      expect(state.features).toHaveLength(2)
      expect(state.features[1]).toEqual(extra)
    })
  })

  describe('updateFeature', () => {
    it('updates matching feature in place', () => {
      const prev = { ...INITIAL_STATE, features: [FEATURE] }
      const updated = { ...FEATURE, vote_count: 6, user_has_voted: true }
      const state = featuresReducer(prev, updateFeature(updated))

      expect(state.features[0].vote_count).toBe(6)
      expect(state.features[0].user_has_voted).toBe(true)
    })

    it('does nothing when id not found', () => {
      const prev = { ...INITIAL_STATE, features: [FEATURE] }
      const state = featuresReducer(prev, updateFeature({ id: 99, vote_count: 99 }))

      expect(state.features).toEqual([FEATURE])
    })
  })

  describe('setLoading', () => {
    it('sets loading flag', () => {
      const state = featuresReducer(INITIAL_STATE, setLoading(true))
      expect(state.loading).toBe(true)
    })
  })

  describe('setError', () => {
    it('sets error and clears loading', () => {
      const prev = { ...INITIAL_STATE, loading: true }
      const state = featuresReducer(prev, setError('oops'))

      expect(state.error).toBe('oops')
      expect(state.loading).toBe(false)
    })
  })
})
