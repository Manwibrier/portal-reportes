import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layout/MainLayout'
import Login from '../../modules/auth/Login'
import { getCurrentUser } from '../services/auth'
import ProtectedRoute from './ProtectedRoute'
import modulesRegistry, {
  flattenModuleRoutes,
  getDefaultRoutePath,
} from './modulesRegistry'

function getRenderableRoutes() {
  return flattenModuleRoutes(modulesRegistry).filter((route) => {
    return Boolean(route?.path && route?.component)
  })
}

function toChildPath(path = '') {
  return String(path).replace(/^\/+/, '')
}

function LoginRoute() {
  const user = getCurrentUser()

  if (!user) {
    return <Login />
  }

  return <Navigate to={getDefaultRoutePath(user.role)} replace />
}

function PrivateLayoutRoute() {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout />
}

function RootRedirect() {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultRoutePath(user.role)} replace />
}

function AppRouter() {
  const routes = getRenderableRoutes()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route path="/" element={<PrivateLayoutRoute />}>
          <Route index element={<RootRedirect />} />

          {routes.map((route) => {
            const ModuleComponent = route.component

            return (
              <Route
                key={route.id}
                path={toChildPath(route.path)}
                element={
                  <ProtectedRoute allowedRoles={route.roles}>
                    <ModuleComponent />
                  </ProtectedRoute>
                }
              />
            )
          })}
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
