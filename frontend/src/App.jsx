import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeaturesPage from './pages/FeaturesPage'
import FeatureDetailPage from './pages/FeatureDetailPage'
import useWebSocket from './hooks/useWebSocket'

const AppRoutes = () => {
  useWebSocket()
  return (
    <Routes>
      <Route path="/" element={<FeaturesPage />} />
      <Route path="/features/:id" element={<FeatureDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
