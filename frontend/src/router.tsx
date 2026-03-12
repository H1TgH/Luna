import { createBrowserRouter } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import RootRedirect from './pages/Rootredirect'
import ProtectedRoute from './components/layout/ProtectedRoute'

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
])