import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './pages/admin/AdminLayout'
import CoursesPage from './pages/admin/CoursesPage'
import LayoutsPage from './pages/admin/LayoutsPage'
import HolesPage from './pages/admin/HolesPage'
import RoundsPage from './pages/admin/RoundsPage'
import RoundDetailPage from './pages/admin/RoundDetailPage'
import StreamPage from './pages/admin/StreamPage'
import OperatorSetup from './pages/operator/OperatorSetup'
import OperatorHome from './pages/operator/OperatorHome'
import ViewerPage from './pages/viewer/ViewerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/courses" replace />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId/layouts" element={<LayoutsPage />} />
          <Route path="layouts/:layoutId/holes" element={<HolesPage />} />
          <Route path="rounds" element={<RoundsPage />} />
          <Route path="rounds/:roundId" element={<RoundDetailPage />} />
          <Route path="stream" element={<StreamPage />} />
        </Route>
        <Route path="/operator" element={<OperatorSetup />} />
        <Route path="/operator/live" element={<OperatorHome />} />
        <Route path="/viewer" element={<ViewerPage />} />
        <Route path="/" element={<Navigate to="/operator" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
