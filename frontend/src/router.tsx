import { createBrowserRouter } from 'react-router'

import GuestRoute from './components/GuestRoute'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Review from './pages/Review'
import ReviewResult from './pages/ReviewResult'

export const router = createBrowserRouter([
  {
    element: <Layout />,
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
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'review/:challengeId', element: <Review /> },
          { path: 'review/:challengeId/result', element: <ReviewResult /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
