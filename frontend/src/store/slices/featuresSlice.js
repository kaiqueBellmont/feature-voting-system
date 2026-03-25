import { createSlice } from '@reduxjs/toolkit'

const featuresSlice = createSlice({
  name: 'features',
  initialState: {
    features: [],
    loading: false,
    error: null,
  },
  reducers: {
    setFeatures(state, action) {
      state.features = action.payload
      state.loading = false
      state.error = null
    },
    addFeature(state, action) {
      state.features.unshift(action.payload)
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

export const { setFeatures, addFeature, updateFeature, setLoading, setError } = featuresSlice.actions
export default featuresSlice.reducer
