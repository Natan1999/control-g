import { databases, DATABASE_ID, COLLECTION_IDS } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'
import Papa from 'papaparse'

export interface ApiDepartment {
  id: number
  name: string
  description?: string
  cityCapitalId?: number
  municipalitiesCount?: number
}

export interface ApiCity {
  id: number
  name: string
  description?: string
  departmentId: number
}

export const geographyService = {
  // ─── Fetch from API ─────────────────────────────────────────────────────────

  async fetchDepartmentsFromApi(): Promise<ApiDepartment[]> {
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

  // ─── Upsert Logic ───────────────────────────────────────────────────────────

  async syncWithApi(onProgress?: (msg: string, progress: number) => void) {
    onProgress?.('Obteniendo departamentos...', 5)
    const depts = await this.fetchDepartmentsFromApi()
    
    onProgress?.('Obteniendo municipios...', 15)
    const cities = await this.fetchCitiesFromApi()

    const total = depts.length + cities.length
    let current = 0

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // 1. Upsert Departments
    const deptMap: Record<number, string> = {}
    for (const d of depts) {
      const code = String(d.id).padStart(2, '0')
      const docId = `dept_${code}`
      
      try {
        await databases.getDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId)
        await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId, {
          name: d.name,
          code: code
        })
      } catch {
        await databases.createDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, docId, {
          name: d.name,
          code: code
        })
      }
      deptMap[d.id] = docId
      current++
      onProgress?.(`Procesando departamentos: ${d.name}`, Math.round((current / total) * 100))
      await sleep(100) // Small delay for depts
    }

    // 2. Upsert Cities (Batching with delay to avoid 429)
    const chunkSize = 5 // Reduced chunk size
    for (let i = 0; i < cities.length; i += chunkSize) {
      const chunk = cities.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (c) => {
        const code = String(c.id).padStart(5, '0')
        const docId = `mun_${code}`
        const deptId = deptMap[c.departmentId] || `dept_${String(c.departmentId).padStart(2, '0')}`

        try {
          await databases.getDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId)
          await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId, {
            name: c.name,
            code: code,
            department_id: deptId
          })
        } catch {
          try {
            await databases.createDocument(DATABASE_ID, COLLECTION_IDS.MUNICIPALITIES, docId, {
              name: c.name,
              code: code,
              department_id: deptId
            })
          } catch (e) {
            console.error(`Error creating municipality ${c.name}:`, e)
          }
        }
      }))
      current += chunk.length
      onProgress?.(`Procesando municipios: ${i + chunk.length} de ${cities.length}`, Math.round((current / total) * 100))
      await sleep(500) // 500ms delay between small chunks to respect 429
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

            // Standard DIVIPOLA Columns (DANE)
            // Código Departamento, Nombre Departamento, Código Municipio, Nombre Municipio
            for (const row of data) {
              const deptCode = row['Código Departamento'] || row['COD_DPTO'] || row['Codigo Departamento']
              const deptName = row['Nombre Departamento'] || row['NOM_DPTO'] || row['Nombre Departamento']
              const munCode = row['Código Municipio'] || row['COD_MUNC'] || row['Codigo Municipio']
              const munName = row['Nombre Municipio'] || row['NOM_MUNC'] || row['Nombre Municipio']

              if (!deptCode || !munCode) continue

              const dId = `dept_${String(deptCode).padStart(2, '0')}`
              const mId = `mun_${String(munCode).padStart(5, '0')}`

              // Upsert Dept
              try {
                await databases.getDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, dId)
              } catch {
                await databases.createDocument(DATABASE_ID, COLLECTION_IDS.DEPARTMENTS, dId, {
                  code: String(deptCode).padStart(2, '0'),
                  name: deptName
                })
              }

              // Upsert Mun
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

  // ─── Zone Management ────────────────────────────────────────────────────────

  async createZone(data: {
    municipalityId: string
    organizationId?: string
    name: string
    type: string
  }) {
    return databases.createDocument(DATABASE_ID, COLLECTION_IDS.ZONES, ID.unique(), {
      ...data,
      metadata: JSON.stringify({ source: 'manual' })
    })
  },

  async deleteZone(id: string) {
    return databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.ZONES, id)
  }
}
