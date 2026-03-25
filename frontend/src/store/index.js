import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import featuresReducer from './slices/featuresSlice'
import notificationsReducer from './slices/notificationsSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    features: featuresReducer,
    notifications: notificationsReducer,
  },
})

export default store
