import { render } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import authReducer from '../store/slices/authSlice'
import featuresReducer from '../store/slices/featuresSlice'
import notificationsReducer from '../store/slices/notificationsSlice'

export function makeStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      features: featuresReducer,
      notifications: notificationsReducer,
    },
    preloadedState,
  })
}

export function renderWithProviders(ui, { preloadedState = {}, initialEntries = ['/'], ...renderOptions } = {}) {
  const store = makeStore(preloadedState)

  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </Provider>
    )
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
