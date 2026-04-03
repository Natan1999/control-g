import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Landing
import LandingPage from '@/pages/landing/LandingPage'

// Auth
import LoginPage from '@/pages/auth/LoginPage'

// Layout
import { Sidebar } from '@/components/layout/Sidebar'

// Superadmin
import SuperDashboard from '@/pages/superadmin/DashboardPage'
import OrganizationsPage from '@/pages/superadmin/OrganizationsPage'
import UsersPage from '@/pages/superadmin/UsersPage'
import AuditPage from '@/pages/superadmin/AuditPage'
import GeographyPage from '@/pages/superadmin/GeographyPage'
import SuperProjectsPage from '@/pages/superadmin/ProjectsPage'
import PlansPage from '@/pages/superadmin/PlansPage'
import SuperSettingsPage from '@/pages/superadmin/SettingsPage'

// Coordinator
import CoordDashboard from '@/pages/coordinator/DashboardPage'
import ProjectsPage from '@/pages/coordinator/ProjectsPage'
import FormBuilderPage from '@/pages/coordinator/FormBuilderPage'
import DataPage from '@/pages/coordinator/DataPage'
import TeamPage from '@/pages/coordinator/TeamPage'
import ReportsPage from '@/pages/coordinator/ReportsPage'
import MapPage from '@/pages/coordinator/MapPage'
import ExportPage from '@/pages/coordinator/ExportPage'
import ChatPage from '@/pages/coordinator/ChatPage'
import SettingsPage from '@/pages/coordinator/SettingsPage'
import TemplatesPageCoord from '@/pages/coordinator/TemplatesPage'

// Assistant
import AssistDashboard from '@/pages/assistant/DashboardPage'
import ReviewPage from '@/pages/assistant/ReviewPage'
import AssistMapPage from '@/pages/assistant/MapPage'
import AssistChatPage from '@/pages/assistant/ChatPage'
import TechniciansPage from '@/pages/assistant/TechniciansPage'
import IncidentsPage from '@/pages/assistant/IncidentsPage'

// Technician
import FieldHome from '@/pages/technician/HomePage'
import FormsPage from '@/pages/technician/FormsPage'
import ScanPage from '@/pages/technician/ScanPage'
import TemplatesPage from '@/pages/technician/TemplatesPage'
import ProfilePage from '@/pages/technician/ProfilePage'

type Role = 'superadmin' | 'coordinator' | 'assistant' | 'technician'

const defaultRoutes: Record<Role, string> = {
  superadmin: '/admin',
  coordinator: '/coord',
  assistant:   '/assist',
  technician:  '/field',
}

function ProtectedLayout({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role as Role)) return <Navigate to={defaultRoutes[user.role as Role]} replace />
  return <>{children}</>
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar role={user?.role as Role ?? 'coordinator'} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}

export default function App() {
  const { user, restore, isLoading } = useAuthStore()
  const [ready, setReady] = useState(false)

  // Restaurar sesión Appwrite al montar
  useEffect(() => {
    restore().finally(() => setReady(true))
  }, [])

  // Pantalla de carga mientras verificamos sesión
  if (!ready) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-black text-2xl">CG</span>
          </div>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={defaultRoutes[user.role as Role]} replace /> : <LoginPage />} />

      {/* Superadmin routes */}
      <Route path="/admin/*" element={
        <ProtectedLayout roles={['superadmin']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<SuperDashboard />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="geography" element={<GeographyPage />} />
              <Route path="projects" element={<SuperProjectsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="settings" element={<SuperSettingsPage />} />
            </Routes>
          </DashboardLayout>
        </ProtectedLayout>
      } />

      {/* Coordinator routes */}
      <Route path="/coord/*" element={
        <ProtectedLayout roles={['coordinator']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<CoordDashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="form-builder" element={<FormBuilderPage />} />
              <Route path="templates" element={<TemplatesPageCoord />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="export" element={<ExportPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </DashboardLayout>
        </ProtectedLayout>
      } />

      {/* Assistant routes */}
      <Route path="/assist/*" element={
        <ProtectedLayout roles={['assistant']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<AssistDashboard />} />
              <Route path="technicians" element={<TechniciansPage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="map" element={<AssistMapPage />} />
              <Route path="chat" element={<AssistChatPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
            </Routes>
          </DashboardLayout>
        </ProtectedLayout>
      } />

      {/* Technician routes (mobile) */}
      <Route path="/field/*" element={
        <ProtectedLayout roles={['technician']}>
          <Routes>
            <Route index element={<FieldHome />} />
            <Route path="forms" element={<FormsPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Routes>
        </ProtectedLayout>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
