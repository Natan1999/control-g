import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import LandingPage from '@/pages/landing/LandingPage'
import SolutionPage from '@/pages/landing/SolutionPage'
import { MarketingSeo } from '@/components/marketing/MarketingSeo'

const BlogIndexPage = lazy(() => import('@/pages/blog/BlogIndexPage'))
const BlogPostPage = lazy(() => import('@/pages/blog/BlogPostPage'))

// Layout
import { Sidebar } from '@/components/layout/Sidebar'

// Private application screens are split from the public marketing bundle.
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminEntitiesPage = lazy(() => import('@/pages/admin/EntitiesPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const AdminBlogPage = lazy(() => import('@/pages/admin/BlogManagerPage'))
const AdminBlogEditorPage = lazy(() => import('@/pages/admin/BlogEditorPage'))
const CoordDashboard = lazy(() => import('@/pages/coordinator/DashboardPage'))
const CoordTeamPage = lazy(() => import('@/pages/coordinator/TeamPage'))
const CoordMunicipalitiesPage = lazy(() => import('@/pages/coordinator/MunicipalitiesPage'))
const CoordFamiliesPage = lazy(() => import('@/pages/coordinator/FamiliesPage'))
const CoordReportsPage = lazy(() => import('@/pages/coordinator/ReportsPage'))
const CoordObservationsPage = lazy(() => import('@/pages/coordinator/ObservationsPage'))
const CoordSettingsPage = lazy(() => import('@/pages/coordinator/SettingsPage'))
const FormBuilderPage = lazy(() => import('@/pages/coordinator/FormBuilderPage'))
const FormsListPage = lazy(() => import('@/pages/shared/FormsListPage'))
const FormResponsesPage = lazy(() => import('@/pages/shared/FormResponsesPage'))
const ApoyoDashboard = lazy(() => import('@/pages/apoyo/DashboardPage'))
const ApoyoProfessionalsPage = lazy(() => import('@/pages/apoyo/ProfessionalsPage'))
const ApoyoReviewPage = lazy(() => import('@/pages/apoyo/ReviewPage'))
const ApoyoObservationsPage = lazy(() => import('@/pages/apoyo/ObservationsPage'))
const FieldHome = lazy(() => import('@/pages/professional/HomePage'))
const FieldFamiliesPage = lazy(() => import('@/pages/professional/FamiliesPage'))
const FieldCapturePage = lazy(() => import('@/pages/professional/CapturePage'))
const FieldReportsPage = lazy(() => import('@/pages/professional/ReportsPage'))
const FieldProfilePage = lazy(() => import('@/pages/professional/ProfilePage'))
const ActivityFormPage = lazy(() => import('@/pages/professional/ActivityFormPage'))
const FormResponderPage = lazy(() => import('@/pages/professional/FormResponderPage'))

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
  const unauthenticatedEntry = Capacitor.isNativePlatform() ? '/login' : '/'

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
    <>
      <MarketingSeo />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-sm font-semibold text-muted-foreground">Cargando Control G…</div>}>
      <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultRoutes[user.role as UserRole]} replace /> : <LoginPage />} />

      {/* Public search-intent pages. Each route has unique content and metadata. */}
      <Route path="/software-caracterizacion-social" element={<SolutionPage path="/software-caracterizacion-social" />} />
      <Route path="/encuestas-offline" element={<SolutionPage path="/encuestas-offline" />} />
      <Route path="/levantamiento-informacion-campo" element={<SolutionPage path="/levantamiento-informacion-campo" />} />
      <Route path="/software-entidades-gobierno" element={<SolutionPage path="/software-entidades-gobierno" />} />
      <Route path="/blog" element={<BlogIndexPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedLayout roles={['admin']}>
          <DashboardLayout>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="entities" element={<AdminEntitiesPage />} />
              <Route path="forms" element={<FormsListPage />} />
              <Route path="forms/new" element={<FormBuilderPage />} />
              <Route path="forms/edit/:id" element={<FormBuilderPage />} />
              <Route path="responses" element={<FormResponsesPage />} />
              <Route path="blog" element={<AdminBlogPage />} />
              <Route path="blog/new" element={<AdminBlogEditorPage />} />
              <Route path="blog/edit/:id" element={<AdminBlogEditorPage />} />
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
              <Route path="forms" element={<FormsListPage />} />
              <Route path="forms/new" element={<FormBuilderPage />} />
              <Route path="forms/edit/:id" element={<FormBuilderPage />} />
              <Route path="responses" element={<FormResponsesPage />} />
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
              <Route path="responses" element={<FormResponsesPage />} />
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
          </Routes>
        </ProtectedLayout>
      } />

      {/* The website keeps its landing page; the installed APK opens at login. */}
      <Route path="/" element={
        user
          ? <Navigate to={defaultRoutes[user.role as UserRole]} replace />
          : Capacitor.isNativePlatform()
            ? <Navigate to="/login" replace />
            : <LandingPage />
      } />
      <Route path="*" element={<Navigate to={user ? defaultRoutes[user.role as UserRole] : unauthenticatedEntry} replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
