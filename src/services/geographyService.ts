import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import Papa from 'papaparse'

// Official DANE Codes for Colombian Departments (Standard DIVIPOLA)
export const DANE_DEPARTMENTS = [
  { code: '05', name: 'Antioquia' },
  { code: '08', name: 'Atlántico' },
  { code: '11', name: 'Bogotá D.C.' },
  { code: '13', name: 'Bolívar' },
  { code: '15', name: 'Boyacá' },
  { code: '17', name: 'Caldas' },
  { code: '18', name: 'Caquetá' },
  { code: '19', name: 'Cauca' },
  { code: '20', name: 'Cesar' },
  { code: '23', name: 'Córdoba' },
  { code: '25', name: 'Cundinamarca' },
  { code: '27', name: 'Chocó' },
  { code: '41', name: 'Huila' },
  { code: '44', name: 'La Guajira' },
  { code: '47', name: 'Magdalena' },
  { code: '50', name: 'Meta' },
  { code: '52', name: 'Nariño' },
  { code: '54', name: 'Norte de Santander' },
  { code: '63', name: 'Quindío' },
  { code: '66', name: 'Risaralda' },
  { code: '68', name: 'Santander' },
  { code: '70', name: 'Sucre' },
  { code: '73', name: 'Tolima' },
  { code: '76', name: 'Valle del Cauca' },
  { code: '81', name: 'Arauca' },
  { code: '85', name: 'Casanare' },
  { code: '86', name: 'Putumayo' },
  { code: '88', name: 'San Andrés y Providencia' },
  { code: '91', name: 'Amazonas' },
  { code: '94', name: 'Guainía' },
  { code: '95', name: 'Guaviare' },
  { code: '97', name: 'Vaupés' },
  { code: '99', name: 'Vichada' }
]

export interface ApiCity {
  id: number
  name: string
  description?: string
  departmentId: number
}

// Helper to map API-Colombia IDs to DANE codes based on name
// This API uses sequential IDs (1..32) that don't match DANE
const mapApiDeptIdToDaneCode = (apiId: number, depts: any[]): string => {
  const apiDept = depts.find(d => d.id === apiId)
  if (!apiDept) return '00'
  const normalizedName = apiDept.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const match = DANE_DEPARTMENTS.find(d => 
    d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedName) ||
    normalizedName.includes(d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  )
  return match ? match.code : '00'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const geographyService = {
  // ─── Fetch from API ─────────────────────────────────────────────────────────

  async fetchDepartmentsFromApi(): Promise<any[]> {
    const res = await fetch('https://api-colombia.com/api/v1/Department')
    if (!res.ok) throw new Error('Error al consultar departamentos')
    return res.json()
  },

  async fetchCitiesFromApi(): Promise<ApiCity[]> {
    const res = await fetch('https://api-colombia.com/api/v1/City')
    if (!res.ok) throw new Error('Error al consultar municipios')
    return res.json()
  },

  // ─── Appwrite Operations ─────────────────────────────────────────────────────

  async listDepartments() {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, [
      Query.limit(100),
      Query.orderAsc('name')
    ])
    return res.documents
  },

  async listMunicipalities(departmentId?: string) {
    const queries = [Query.limit(1200), Query.orderAsc('name')]
    if (departmentId) {
      queries.push(Query.equal('department_id', departmentId))
    }
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, queries)
    return res.documents
  },

  async listZones(municipalityId: string, organizationId?: string) {
    const queries = [
      Query.equal('municipality_id', municipalityId),
      Query.limit(100)
    ]
    if (organizationId) {
      queries.push(Query.equal('organization_id', organizationId))
    }
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_IDS.ZONES, queries)
    return res.documents
  },

  // ─── Sync Logic ────────────────────────────────────────────────────────────

  async syncWithApi(onProgress?: (msg: string, progress: number) => void) {
    onProgress?.('Iniciando sincronización limpia...', 0)
    
    // We already have a clean DANE list. We don't need to sync depts, we just UPSERT them to ensure they exist.
    const deptsCount = DANE_DEPARTMENTS.length
    let current = 0

    // 1. Force Sync Official Departments
    for (const d of DANE_DEPARTMENTS) {
      const docId = `dept_${d.code}`
      try {
        await databases.getDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId)
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId, {
          name: d.name,
          code: d.code
        })
      } catch {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId, {
          name: d.name,
          code: d.code
        })
      }
      current++
      onProgress?.(`Verificando departamento: ${d.name}`, Math.round((current / deptsCount) * 20))
      await sleep(100)
    }

    // 2. Fetch API Data for Mapping
    onProgress?.('Actualizando municipios...', 25)
    const apiDepts = await this.fetchDepartmentsFromApi()
    const apiCities = await this.fetchCitiesFromApi()

    const totalCities = apiCities.length
    const chunkSize = 5
    
    for (let i = 0; i < totalCities; i += chunkSize) {
      const chunk = apiCities.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (c) => {
        const daneDeptCode = mapApiDeptIdToDaneCode(c.departmentId, apiDepts)
        const deptDocId = `dept_${daneDeptCode}`
        
        // City Code: Standard DANE should be 5 digits (Dept Code + Mun Code)
        // Since API-Colombia uses internal IDs, we'll try to stick to docId consistency
        const docId = `mun_${String(c.id).padStart(5, '0')}`

        try {
          await databases.getDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId)
          await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId, {
            name: c.name,
            code: String(c.id).padStart(5, '0'),
            department_id: deptDocId
          })
        } catch {
          try {
            await databases.createDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId, {
              name: c.name,
              code: String(c.id).padStart(5, '0'),
              department_id: deptDocId
            })
          } catch (e) {
            console.error(`Error creating city ${c.name}:`, e)
          }
        }
      }))
      
      onProgress?.(`Actualizando municipios: ${i + chunk.length} de ${totalCities}`, 30 + Math.round((i / totalCities) * 70))
      await sleep(500)
    }

    onProgress?.('Sincronización completada', 100)
  },

  async importFromCSV(file: File, onProgress?: (msg: string, progress: number) => void) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const data = results.data as any[]
            const total = data.length
            let current = 0

            for (const row of data) {
              const deptCode = row['Código Departamento'] || row['COD_DPTO'] || row['Codigo Departamento']
              const deptName = row['Nombre Departamento'] || row['NOM_DPTO'] || row['Nombre Departamento']
              const munCode = row['Código Municipio'] || row['COD_MUNC'] || row['Codigo Municipio']
              const munName = row['Nombre Municipio'] || row['NOM_MUNC'] || row['Nombre Municipio']

              if (!deptCode || !munCode) continue

              const dId = `dept_${String(deptCode).padStart(2, '0')}`
              const mId = `mun_${String(munCode).padStart(5, '0')}`

              try {
                await databases.getDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, dId)
              } catch {
                await databases.createDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, dId, {
                  code: String(deptCode).padStart(2, '0'),
                  name: deptName
                })
              }

              try {
                await databases.getDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, mId)
              } catch {
                await databases.createDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, mId, {
                  department_id: dId,
                  code: String(munCode).padStart(5, '0'),
                  name: munName
                })
              }

              current++
              if (current % 10 === 0) {
                onProgress?.(`Importando: ${munName}`, Math.round((current / total) * 100))
              }
            }
            onProgress?.('Importación finalizada', 100)
            resolve(true)
          } catch (err) {
            reject(err)
          }
        },
        error: (err) => reject(err)
      })
    })
  },

  async createZone(data: { municipalityId: string; organizationId?: string; name: string; type: string }) {
    return databases.createDocument(DATABASE_ID, COLLECTION_IDS.ZONES, ID.unique(), {
      ...data,
      metadata: JSON.stringify({ source: 'manual' })
    })
  },

  async deleteZone(id: string) {
    return databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.ZONES, id)
  }
}
