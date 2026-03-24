import { createBrowserRouter } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import RootRedirect from './pages/Rootredirect'
import SetupProfilePage from './pages/SetupProfilePage'
import ProtectedRoute from './components/layout/ProtectedRoute'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import ConfirmEmailPendingPage from './pages/ConfirmEmailPendingPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        path: 'setup-profile',
        element: <SetupProfilePage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: ':username',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/confirm-email',
    element: <ConfirmEmailPage />,
  },
  {
    path: '/confirm-email-pending',
    element: <ConfirmEmailPendingPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />
  }
])