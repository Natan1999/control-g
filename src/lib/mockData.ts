import type { Organization, Project, Form, FormResponse, TeamMember, Notification, ChartDataPoint } from '@/types'

export const mockOrganizations: Organization[] = [
  {
    id: 'org-001', name: 'Alcaldía de Cartagena', nit: '800.100.400-2',
    contactEmail: 'tic@cartagena.gov.co', contactPhone: '+57 5 660 0100',
    plan: 'gobierno', status: 'active', maxUsers: 200, maxForms: 50,
    maxOcrMonthly: 2000, maxStorageGb: 100,
    createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'org-002', name: 'IPSE — Instituto de Planificación', nit: '900.234.567-1',
    contactEmail: 'datos@ipse.gov.co', contactPhone: '+57 1 745 9000',
    plan: 'enterprise', status: 'active', maxUsers: 50, maxForms: 20,
    maxOcrMonthly: 500, maxStorageGb: 30,
    createdAt: '2026-02-01T08:00:00Z', updatedAt: '2026-03-10T14:00:00Z',
  },
  {
    id: 'org-003', name: 'Fundación Colombia Presente', nit: '901.456.789-3',
    contactEmail: 'info@colombiapresente.org', contactPhone: '+57 315 234 5678',
    plan: 'professional', status: 'active', maxUsers: 20, maxForms: 10,
    maxOcrMonthly: 200, maxStorageGb: 10,
    createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-03-15T09:00:00Z',
  },
]

export const mockProjects: Project[] = [
  {
    id: 'proj-001', organizationId: 'org-001', coordinatorId: 'co-001',
    name: 'Caracterización Socioeconómica Cartagena 2026',
    description: 'Levantamiento de información socioeconómica en los 15 corregimientos de Cartagena',
    type: 'socioeconomica', departmentId: 13, municipalityId: 13001,
    startDate: '2026-03-01', endDate: '2026-06-30',
    targetForms: 5000, status: 'active',
    createdAt: '2026-02-15T08:00:00Z', updatedAt: '2026-03-20T15:00:00Z',
    totalForms: 1842, completedForms: 1842, activeTechnicians: 24,
  },
  {
    id: 'proj-002', organizationId: 'org-001', coordinatorId: 'co-001',
    name: 'Diagnóstico de Conectividad Digital — Bolívar',
    description: 'Evaluación del acceso a internet y TIC en municipios del Departamento de Bolívar',
    type: 'conectividad', departmentId: 13,
    startDate: '2026-04-01', endDate: '2026-07-31',
    targetForms: 2000, status: 'draft',
    createdAt: '2026-03-10T08:00:00Z', updatedAt: '2026-03-25T10:00:00Z',
    totalForms: 0, completedForms: 0, activeTechnicians: 0,
  },
]

export const mockForms: Form[] = [
  {
    id: 'form-001', projectId: 'proj-001', organizationId: 'org-001', createdBy: 'co-001',
    name: 'Ficha de Caracterización Socioeconómica', description: 'Formulario de recolección de datos del hogar',
    version: 3, status: 'published',
    schema: {
      pages: [
        {
          id: 'page_1', title: 'Identificación del Hogar',
          fields: [
            { id: 'f001', type: 'text_short', label: 'Nombre del jefe de hogar', required: true },
            { id: 'f002', type: 'text_short', label: 'Número de cédula', required: true, validations: { pattern: '^[0-9]{6,10}$' } },
            { id: 'f003', type: 'numeric', label: 'Número de personas en el hogar', required: true, validations: { min: 1, max: 30 } },
            { id: 'f004', type: 'single_select', label: 'Estrato socioeconómico', required: true, displayAs: 'radio',
              options: [{ value: '1', label: 'Estrato 1' }, { value: '2', label: 'Estrato 2' }, { value: '3', label: 'Estrato 3' }, { value: '4', label: 'Estrato 4' }] },
            { id: 'f005', type: 'yes_no', label: '¿Tiene acceso a internet en el hogar?', required: true },
            { id: 'f006', type: 'multi_select', label: 'Servicios públicos con los que cuenta', required: true,
              options: [{ value: 'agua', label: 'Agua potable' }, { value: 'energia', label: 'Energía eléctrica' }, { value: 'gas', label: 'Gas natural' }, { value: 'aseo', label: 'Recolección de basuras' }] },
            { id: 'f007', type: 'photo', label: 'Foto de la fachada', required: false, maxFiles: 2 },
            { id: 'f008', type: 'geolocation', label: 'Ubicación del predio', required: true, autoCapture: true },
          ]
        },
        {
          id: 'page_2', title: 'Cierre',
          fields: [
            { id: 'f009', type: 'text_long', label: 'Observaciones generales', required: false },
            { id: 'f010', type: 'signature', label: 'Firma del encuestado', required: true, consentText: 'Autorizo el tratamiento de mis datos conforme a la Ley 1581 de 2012' },
          ]
        }
      ]
    },
    totalFields: 10, createdAt: '2026-02-20T08:00:00Z', updatedAt: '2026-03-15T14:00:00Z',
  },
]

export const mockResponses: FormResponse[] = [
  {
    id: 'resp-001', localId: 'loc-001', formId: 'form-001', formVersion: 3,
    projectId: 'proj-001', organizationId: 'org-001', technicianId: 'te-001', zoneId: 'zone-001',
    data: { f001: 'Juan Carlos Pérez Martínez', f002: '1047382956', f003: 5, f004: '2', f005: true, f006: ['agua', 'energia', 'aseo'] },
    latitude: 10.3910, longitude: -75.4794, accuracy: 8.5,
    status: 'approved', source: 'digital',
    startedAt: '2026-03-20T09:15:00Z', completedAt: '2026-03-20T09:42:00Z', syncedAt: '2026-03-20T10:05:00Z',
    createdAt: '2026-03-20T10:05:00Z',
    technicianName: 'Ana García', formName: 'Ficha de Caracterización Socioeconómica', zoneName: 'Barrio El Pozón',
  },
  {
    id: 'resp-002', localId: 'loc-002', formId: 'form-001', formVersion: 3,
    projectId: 'proj-001', organizationId: 'org-001', technicianId: 'te-002', zoneId: 'zone-002',
    data: { f001: 'María Elena Gómez', f002: '32456712', f003: 3, f004: '1', f005: false, f006: ['agua', 'energia'] },
    latitude: 10.4035, longitude: -75.5082, accuracy: 12.1,
    status: 'in_review', source: 'ocr_camera', ocrConfidence: 0.87,
    startedAt: '2026-03-20T10:30:00Z', completedAt: '2026-03-20T10:55:00Z', syncedAt: '2026-03-20T11:10:00Z',
    createdAt: '2026-03-20T11:10:00Z',
    technicianName: 'Luis Martínez', formName: 'Ficha de Caracterización Socioeconómica', zoneName: 'Corregimiento La Boquilla',
  },
  {
    id: 'resp-003', localId: 'loc-003', formId: 'form-001', formVersion: 3,
    projectId: 'proj-001', organizationId: 'org-001', technicianId: 'te-003', zoneId: 'zone-001',
    data: { f001: 'Carlos Alberto Duran', f002: '73245891', f003: 7, f004: '3', f005: true, f006: ['agua', 'energia', 'gas', 'aseo'] },
    latitude: 10.3855, longitude: -75.4923, accuracy: 5.0,
    status: 'rejected', source: 'digital',
    rejectionReason: 'Número de cédula no coincide con el nombre proporcionado. Verificar con documento físico.',
    reviewedBy: 'as-001', reviewedAt: '2026-03-21T08:00:00Z',
    startedAt: '2026-03-20T14:00:00Z', completedAt: '2026-03-20T14:25:00Z', syncedAt: '2026-03-20T15:00:00Z',
    createdAt: '2026-03-20T15:00:00Z',
    technicianName: 'Pedro Suárez', formName: 'Ficha de Caracterización Socioeconómica', zoneName: 'Barrio El Pozón',
  },
]

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm-001', userId: 'te-001', projectId: 'proj-001',
    user: { id: 'te-001', organizationId: 'org-001', fullName: 'Ana García', email: 'ana@example.com', role: 'technician', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
    assignedZoneId: 'zone-001', isActive: true, joinedAt: '2026-02-15T00:00:00Z',
    formsToday: 12, isOnline: true, isPending: false,
  },
  {
    id: 'tm-002', userId: 'te-002', projectId: 'proj-001',
    user: { id: 'te-002', organizationId: 'org-001', fullName: 'Luis Martínez', email: 'luis@example.com', role: 'technician', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
    assignedZoneId: 'zone-002', isActive: true, joinedAt: '2026-02-15T00:00:00Z',
    formsToday: 8, isOnline: false, isPending: true,
  },
  {
    id: 'tm-003', userId: 'te-003', projectId: 'proj-001',
    user: { id: 'te-003', organizationId: 'org-001', fullName: 'Pedro Suárez', email: 'pedro@example.com', role: 'technician', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
    assignedZoneId: 'zone-003', isActive: true, joinedAt: '2026-02-15T00:00:00Z',
    formsToday: 15, isOnline: true, isPending: false,
  },
  {
    id: 'tm-004', userId: 'te-004', projectId: 'proj-001',
    user: { id: 'te-004', organizationId: 'org-001', fullName: 'Sofía Herrera', email: 'sofia@example.com', role: 'technician', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
    assignedZoneId: 'zone-004', isActive: true, joinedAt: '2026-02-15T00:00:00Z',
    formsToday: 6, isOnline: false, isPending: false,
    lastSyncAt: '2026-03-20T08:30:00Z',
  },
]

export const mockDailyData: ChartDataPoint[] = [
  { name: '5 Mar', value: 42 }, { name: '6 Mar', value: 67 }, { name: '7 Mar', value: 55 },
  { name: '8 Mar', value: 0 }, { name: '9 Mar', value: 0 }, { name: '10 Mar', value: 89 },
  { name: '11 Mar', value: 95 }, { name: '12 Mar', value: 115 }, { name: '13 Mar', value: 98 },
  { name: '14 Mar', value: 134 }, { name: '15 Mar', value: 156 }, { name: '16 Mar', value: 143 },
  { name: '17 Mar', value: 112 }, { name: '18 Mar', value: 128 }, { name: '19 Mar', value: 167 },
  { name: '20 Mar', value: 189 }, { name: '21 Mar', value: 145 }, { name: '22 Mar', value: 201 },
  { name: '23 Mar', value: 178 }, { name: '24 Mar', value: 192 }, { name: '25 Mar', value: 220 },
  { name: '26 Mar', value: 215 }, { name: '27 Mar', value: 198 }, { name: '28 Mar', value: 234 },
  { name: '29 Mar', value: 87 },
]

export const mockZoneData: ChartDataPoint[] = [
  { name: 'El Pozón', value: 456, total: 600 },
  { name: 'La Boquilla', value: 312, total: 400 },
  { name: 'Bayunca', value: 198, total: 350 },
  { name: 'Pasacaballo', value: 445, total: 500 },
  { name: 'Bocachico', value: 231, total: 400 },
  { name: 'Arroyo Grande', value: 178, total: 300 },
  { name: 'Punta Canoa', value: 22, total: 200 },
]

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001', userId: 'co-001',
    title: 'Formulario pendiente de revisión',
    body: 'Ana García envió un formulario desde El Pozón hace 15 minutos',
    type: 'sync', read: false, createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'notif-002', userId: 'co-001',
    title: 'Técnico inactivo — Sofía Herrera',
    body: 'Sofía Herrera no ha sincronizado en las últimas 4 horas',
    type: 'alert', read: false, createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'notif-003', userId: 'co-001',
    title: 'Meta diaria alcanzada ✅',
    body: 'El equipo completó 189 formularios hoy. Meta: 180',
    type: 'system', read: true, createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]
