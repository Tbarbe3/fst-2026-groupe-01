import { createBrowserRouter } from 'react-router'

import GuestRoute from './components/GuestRoute'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import SiteLayout from './components/SiteLayout'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

// Pages lourdes (recharts, Monaco) chargées à la demande pour alléger le bundle initial.
const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
})

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <SiteLayout />,
        children: [
          { index: true, element: <Home /> },
          {
            element: <GuestRoute />,
            children: [
              { path: 'login', element: <AuthPage mode="login" /> },
              { path: 'register', element: <AuthPage mode="register" /> },
            ],
          },
          {
            element: <ProtectedRoute />,
            children: [
              { path: 'dashboard', lazy: lazyPage(() => import('./pages/Dashboard')) },
              { path: 'review/:challengeId', lazy: lazyPage(() => import('./pages/Review')) },
              {
                path: 'review/:challengeId/result',
                lazy: lazyPage(() => import('./pages/ReviewResult')),
              },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
