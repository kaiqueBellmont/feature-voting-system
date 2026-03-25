import axios from 'axios'
import store from '../store'
import { setCredentials, logout } from '../store/slices/authSlice'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// On 401: try to refresh the access token, then retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const refresh = localStorage.getItem('refresh')
        const { data } = await axios.post('http://localhost:8000/api/token/refresh/', { refresh })

        store.dispatch(setCredentials({ access: data.access }))
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        store.dispatch(logout())
      }
    }

    return Promise.reject(error)
  }
)

export default api
