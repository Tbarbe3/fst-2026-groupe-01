import { createBrowserRouter, Navigate } from 'react-router'

import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Review from './pages/Review'
import ReviewResult from './pages/ReviewResult'

export const router = createBrowserRouter([
  { index: true, element: <Navigate to="/dashboard" replace /> },
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
])
