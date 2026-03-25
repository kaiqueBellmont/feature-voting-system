import { createSlice } from '@reduxjs/toolkit'

const PAGE_SIZE = 10

const featuresSlice = createSlice({
  name: 'features',
  initialState: {
    features: [],
    count: 0,
    currentPage: 1,
    loading: false,
    error: null,
  },
  reducers: {
    setFeatures(state, action) {
      state.features = action.payload.results
      state.count = action.payload.count
      state.loading = false
      state.error = null
    },
    setCurrentPage(state, action) {
      state.currentPage = action.payload
    },
    addFeature(state, action) {
      state.features.unshift(action.payload)
      state.count += 1
    },
    updateFeature(state, action) {
      const index = state.features.findIndex(f => f.id === action.payload.id)
      if (index !== -1) state.features[index] = action.payload
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    setError(state, action) {
      state.error = action.payload
      state.loading = false
    },
  },
})

export { PAGE_SIZE }
export const { setFeatures, setCurrentPage, addFeature, updateFeature, setLoading, setError } = featuresSlice.actions
export default featuresSlice.reducer
