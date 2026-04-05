import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

// Auth
import LoginPage from '@/pages/auth/LoginPage'

// Layout
import { Sidebar } from '@/components/layout/Sidebar'

// Admin
import AdminDashboard from '@/pages/admin/DashboardPage'
import AdminEntitiesPage from '@/pages/admin/EntitiesPage'
import AdminSettingsPage from '@/pages/admin/SettingsPage'

// Coordinator
import CoordDashboard from '@/pages/coordinator/DashboardPage'
import CoordTeamPage from '@/pages/coordinator/TeamPage'
import CoordMunicipalitiesPage from '@/pages/coordinator/MunicipalitiesPage'
import CoordFamiliesPage from '@/pages/coordinator/FamiliesPage'
import CoordReportsPage from '@/pages/coordinator/ReportsPage'
import CoordObservationsPage from '@/pages/coordinator/ObservationsPage'
import CoordSettingsPage from '@/pages/coordinator/SettingsPage'
import FormBuilderPage from '@/pages/coordinator/FormBuilderPage'

// Apoyo Administrativo
import ApoyoDashboard from '@/pages/apoyo/DashboardPage'
import ApoyoProfessionalsPage from '@/pages/apoyo/ProfessionalsPage'
import ApoyoReviewPage from '@/pages/apoyo/ReviewPage'
import ApoyoObservationsPage from '@/pages/apoyo/ObservationsPage'

// Profesional de Campo
import FieldHome from '@/pages/professional/HomePage'
import FieldFamiliesPage from '@/pages/professional/FamiliesPage'
import FieldCapturePage from '@/pages/professional/CapturePage'
import FieldReportsPage from '@/pages/professional/ReportsPage'
import FieldProfilePage from '@/pages/professional/ProfilePage'
import ActivityFormPage from '@/pages/professional/ActivityFormPage'
import FormResponderPage from '@/pages/professional/FormResponderPage'
import FieldFreePhotoPage from '@/pages/professional/FreePhotoPage'

import { useSync } from '@/hooks/useSync'

const defaultRoutes: Record<UserRole, string> = {
  admin:        '/admin',
  coordinator:  '/coord',
  support:      '/apoyo',
  professional: '/field',
}

function ProtectedLayout({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role as UserRole)) return <Navigate to={defaultRoutes[user.role as UserRole]} replace />
  return <>{children}</>
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar role={user?.role as UserRole ?? 'coordinator'} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}

export default function App() {
  const { user, restore } = useAuthStore()
  const [ready, setReady] = useState(false)

  useSync()

  useEffect(() => {
    restore().finally(() => setReady(true))
  }, [restore])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
           style={{ background: '#1B3A4B' }}>
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="relative flex flex-col items-center gap-6 text-center px-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 animate-bounce">
            <span className="text-white font-black text-3xl tracking-tighter">CG</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-white font-bold text-xl tracking-tight">Control G</h1>
            <p className="text-white/60 text-sm max-w-[240px] leading-relaxed">
              Gestión Social en Campo<br/>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-2 block">DRAN Digital S.A.S.</span>
            </p>
          </div>
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultRoutes[user.role as UserRole]} replace /> : <LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedLayout roles={['admin']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="entities" element={<AdminEntitiesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
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
              <Route path="team" element={<CoordTeamPage />} />
              <Route path="municipalities" element={<CoordMunicipalitiesPage />} />
              <Route path="families" element={<CoordFamiliesPage />} />
              <Route path="reports" element={<CoordReportsPage />} />
              <Route path="observations" element={<CoordObservationsPage />} />
              <Route path="forms" element={<FormBuilderPage />} />
              <Route path="settings" element={<CoordSettingsPage />} />
            </Routes>
          </DashboardLayout>
        </ProtectedLayout>
      } />

      {/* Apoyo Administrativo routes */}
      <Route path="/apoyo/*" element={
        <ProtectedLayout roles={['support']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<ApoyoDashboard />} />
              <Route path="professionals" element={<ApoyoProfessionalsPage />} />
              <Route path="review" element={<ApoyoReviewPage />} />
              <Route path="observations" element={<ApoyoObservationsPage />} />
            </Routes>
          </DashboardLayout>
        </ProtectedLayout>
      } />

      {/* Profesional de Campo routes (mobile) */}
      <Route path="/field/*" element={
        <ProtectedLayout roles={['professional']}>
          <Routes>
            <Route index element={<FieldHome />} />
            <Route path="families" element={<FieldFamiliesPage />} />
            <Route path="capture" element={<FieldCapturePage />} />
            <Route path="reports" element={<FieldReportsPage />} />
            <Route path="profile" element={<FieldProfilePage />} />
            <Route path="activity/:familyId/:activityType" element={<ActivityFormPage />} />
            <Route path="forms/:formId" element={<FormResponderPage />} />
            <Route path="forms/:formId/:familyId" element={<FormResponderPage />} />
            <Route path="capture/free-photo" element={<FieldFreePhotoPage />} />
          </Routes>
        </ProtectedLayout>
      } />

      <Route path="/" element={<Navigate to={user ? defaultRoutes[user.role as UserRole] : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? defaultRoutes[user.role as UserRole] : '/login'} replace />} />
    </Routes>
  )
}
