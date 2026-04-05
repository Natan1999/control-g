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

// Fallback estático DIVIPOLA (32 Departamentos + Bogotá DC)
const COLOMBIA_DEPARTMENTS: Department[] = [
  { id: '05', name: 'ANTIOQUIA' },
  { id: '08', name: 'ATLÁNTICO' },
  { id: '11', name: 'BOGOTÁ, D.C.' },
  { id: '13', name: 'BOLÍVAR' },
  { id: '15', name: 'BOYACÁ' },
  { id: '17', name: 'CALDAS' },
  { id: '18', name: 'CAQUETÁ' },
  { id: '19', name: 'CAUCA' },
  { id: '20', name: 'CESAR' },
  { id: '23', name: 'CÓRDOBA' },
  { id: '25', name: 'CUNDINAMARCA' },
  { id: '27', name: 'CHOCÓ' },
  { id: '41', name: 'HUILA' },
  { id: '44', name: 'LA GUAJIRA' },
  { id: '47', name: 'MAGDALENA' },
  { id: '50', name: 'META' },
  { id: '52', name: 'NARIÑO' },
  { id: '54', name: 'NORTE DE SANTANDER' },
  { id: '63', name: 'QUINDÍO' },
  { id: '66', name: 'RISARALDA' },
  { id: '68', name: 'SANTANDER' },
  { id: '70', name: 'SUCRE' },
  { id: '73', name: 'TOLIMA' },
  { id: '76', name: 'VALLE DEL CAUCA' },
  { id: '81', name: 'ARAUCA' },
  { id: '85', name: 'CASANARE' },
  { id: '86', name: 'PUTUMAYO' },
  { id: '88', name: 'ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA' },
  { id: '91', name: 'AMAZONAS' },
  { id: '94', name: 'GUAINÍA' },
  { id: '95', name: 'GUAVIARE' },
  { id: '97', name: 'VAUPÉS' },
  { id: '99', name: 'VICHADA' }
].sort((a, b) => a.name.localeCompare(b.name));

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
    if (!response.ok) throw new Error('CORS o Servidor DANE no responde');

    const data = await response.json();
    if (!data.features) throw new Error('Formato DANE inválido');

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

    return result.length > 0 ? result : COLOMBIA_DEPARTMENTS;
  } catch (error) {
    console.warn('Usando fallback DIVIPOLA por error en DANE ArcGIS API:', (error as Error).message);
    return COLOMBIA_DEPARTMENTS;
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
