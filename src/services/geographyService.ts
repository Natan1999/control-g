/**
 * Control G — geographyService (ArcGIS DANE Integration)
 * 
 * Este servicio consume los datos oficiales de DIVIPOLA (DANE)
 * a través de los servicios REST de ArcGIS.
 */

const DANE_ARCGIS_BASE = 'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer';

// Layers identified:
const LAYER_DEPARTAMENTO = 319;
const LAYER_MUNICIPIO = 317;
const LAYER_CENTRO_POBLADO = 305;

export interface Department {
  id: string;
  name: string;
}

export interface Municipality {
  id: string;
  name: string;
  departmentId: string;
}

export interface Settlement {
  id: string;
  name: string;
  municipalityId: string;
}

/**
 * Obtiene la lista de departamentos oficiales de Colombia.
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'DPTO_CCDGO,DPTO_CNMBRE',
      f: 'json'
    });

    const response = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_DEPARTAMENTO}/query?${params.toString()}`);
    if (!response.ok) throw new Error('Error al consultar departamentos en DANE ArcGIS');

    const data = await response.json();
    
    // Deduplicación estricta por código (DIVIPOLA exige 33 registros: 32 deptos + Bogotá)
    const uniqueDepts = new Map<string, Department>();
    
    data.features.forEach((f: any) => {
      const id = f.attributes.DPTO_CCDGO;
      const name = f.attributes.DPTO_CNMBRE;
      if (id && name && !uniqueDepts.has(id)) {
        uniqueDepts.set(id, { id, name: name.toUpperCase().trim() });
      }
    });

    const result = Array.from(uniqueDepts.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    // Validar caso crítico de 33 entidades
    if (result.length < 30) {
      console.warn(`DANE API retornó solo ${result.length} departamentos. Usando fallback parcial.`);
    }

    return result;
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [{ id: '13', name: 'BOLÍVAR' }]; // Fallback básico
  }
}

/**
 * Obtiene los municipios de un departamento específico.
 * @param departmentId Código DANE del departamento (2 dígitos)
 */
export async function getMunicipalities(departmentId: string): Promise<Municipality[]> {
  try {
    const params = new URLSearchParams({
      where: `DPTO_CCDGO = '${departmentId}'`,
      outFields: 'MPIO_CCDGO,MPIO_CNMBRE,DPTO_CCDGO',
      orderByFields: 'MPIO_CNMBRE ASC',
      f: 'json'
    });

    const response = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_MUNICIPIO}/query?${params.toString()}`);
    if (!response.ok) throw new Error('Error al consultar municipios en DANE ArcGIS');

    const data = await response.json();

    const uniqueMpios = new Map<string, Municipality>();
    
    data.features.forEach((f: any) => {
      const id = f.attributes.MPIO_CCDGO;
      const name = f.attributes.MPIO_CNMBRE;
      const departmentId = f.attributes.DPTO_CCDGO;
      if (!uniqueMpios.has(id)) {
        uniqueMpios.set(id, { id, name, departmentId });
      }
    });

    return Array.from(uniqueMpios.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`Error fetching municipalities for dept ${departmentId}:`, error);
    return [];
  }
}

/**
 * Obtiene los centros poblados de un municipio específico.
 * @param municipalityId Código DANE del municipio (5 dígitos)
 */
export async function getSettlements(municipalityId: string): Promise<Settlement[]> {
  try {
    const params = new URLSearchParams({
      where: `MPIO_CCDGO = '${municipalityId}'`,
      outFields: 'CP_CCDGO,CP_CNMBRE,MPIO_CCDGO',
      orderByFields: 'CP_CNMBRE ASC',
      f: 'json'
    });

    const response = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_CENTRO_POBLADO}/query?${params.toString()}`);
    if (!response.ok) throw new Error('Error al consultar centros poblados en DANE ArcGIS');

    const data = await response.json();

    return data.features.map((f: any) => ({
      id: f.attributes.CP_CCDGO,
      name: f.attributes.CP_CNMBRE,
      municipalityId: f.attributes.MPIO_CCDGO
    }));
  } catch (error) {
    console.error(`Error fetching settlements for muni ${municipalityId}:`, error);
    return [];
  }
}
