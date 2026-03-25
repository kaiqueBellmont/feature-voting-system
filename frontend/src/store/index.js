import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import featuresReducer from './slices/featuresSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    features: featuresReducer,
  },
})

export default store
