import type { ActivityType, FormField, FormPage } from '@/types'

export interface ControlGFormTemplate {
  id: string
  title: string
  description: string
  category: string
  countries: string[]
  recommendedFor: string
  type: ActivityType
  pages: FormPage[]
}

const yesNo = [
  { label: 'Sí', value: 'si' },
  { label: 'No', value: 'no' },
  { label: 'No sabe / no responde', value: 'ns_nr' },
]

const field = (id: string, type: FormField['type'], label: string, required = false, options?: FormField['options']): FormField => ({
  id,
  type,
  label,
  required,
  options,
})

const locationPage = (prefix: string): FormPage => ({
  id: `${prefix}_territorio`,
  title: 'Ubicación y evidencia territorial',
  description: 'Registra la división administrativa conforme a la configuración del país y la posición WGS84.',
  fields: [
    field(`${prefix}_municipality`, 'municipality', 'Municipio, distrito o localidad', true),
    field(`${prefix}_sector`, 'text', 'Barrio, comunidad, aldea, vereda o sector', true),
    field(`${prefix}_gps`, 'gps', 'Coordenada GPS de la visita', true),
    field(`${prefix}_photo`, 'photo', 'Evidencia fotográfica autorizada del entorno'),
  ],
})

const consentPage = (prefix: string): FormPage => ({
  id: `${prefix}_consent`,
  title: 'Consentimiento y cierre',
  description: 'La entidad debe adaptar el texto de tratamiento de datos a la legislación aplicable.',
  fields: [
    field(`${prefix}_consent`, 'radio', '¿La persona acepta voluntariamente el tratamiento de sus datos para esta caracterización?', true, yesNo.slice(0, 2)),
    field(`${prefix}_signature`, 'signature', 'Firma o constancia de consentimiento', true),
    field(`${prefix}_observations`, 'longtext', 'Observaciones del profesional de campo'),
  ],
})

export const FORM_TEMPLATES: ControlGFormTemplate[] = [
  {
    id: 'demografica-socioeconomica',
    title: 'Caracterización demográfica y socioeconómica',
    description: 'Perfil del hogar, educación, ocupación, ingresos, vivienda y acceso a servicios.',
    category: 'Población y hogares',
    countries: ['LATAM'],
    recommendedFor: 'Alcaldías, gobernaciones, programas sociales y cooperación internacional',
    type: 'ex_ante',
    pages: [
      locationPage('demo'),
      {
        id: 'demo_hogar', title: 'Composición y condiciones del hogar', fields: [
          field('demo_household_size', 'number', 'Número de personas en el hogar', true),
          field('demo_head_sex', 'radio', 'Sexo de la persona cabeza de hogar', true, [
            { label: 'Mujer', value: 'mujer' }, { label: 'Hombre', value: 'hombre' }, { label: 'Intersexual', value: 'intersexual' }, { label: 'Prefiere no responder', value: 'no_responde' },
          ]),
          field('demo_age_range', 'select', 'Rango de edad de la persona informante', true, [
            { label: '18 a 28 años', value: '18_28' }, { label: '29 a 44 años', value: '29_44' }, { label: '45 a 59 años', value: '45_59' }, { label: '60 años o más', value: '60_mas' },
          ]),
          field('demo_education', 'select', 'Máximo nivel educativo alcanzado', true, [
            { label: 'Sin escolaridad', value: 'ninguno' }, { label: 'Primaria', value: 'primaria' }, { label: 'Secundaria o media', value: 'secundaria' }, { label: 'Técnica o tecnológica', value: 'tecnica' }, { label: 'Universitaria', value: 'universitaria' }, { label: 'Posgrado', value: 'posgrado' },
          ]),
          field('demo_employment', 'select', 'Situación ocupacional principal', true, [
            { label: 'Empleo formal', value: 'formal' }, { label: 'Trabajo informal', value: 'informal' }, { label: 'Trabajo de cuidado no remunerado', value: 'cuidado' }, { label: 'Desempleo', value: 'desempleo' }, { label: 'Estudiante', value: 'estudiante' }, { label: 'Pensionado/a', value: 'pensionado' },
          ]),
          field('demo_income', 'select', 'Rango de ingreso mensual del hogar', true, [
            { label: 'Sin ingresos', value: 'sin_ingresos' }, { label: 'Menos de 1 salario mínimo', value: 'menos_1' }, { label: 'Entre 1 y 2 salarios mínimos', value: '1_2' }, { label: 'Más de 2 salarios mínimos', value: 'mas_2' }, { label: 'No responde', value: 'no_responde' },
          ]),
          field('demo_home_tenure', 'select', 'Tenencia de la vivienda', true, [
            { label: 'Propia pagada', value: 'propia' }, { label: 'Propia en pago', value: 'propia_pago' }, { label: 'Arrendada', value: 'arrendada' }, { label: 'Familiar o prestada', value: 'prestada' }, { label: 'Ocupación de hecho', value: 'ocupacion' },
          ]),
          field('demo_public_services', 'multi_select', 'Servicios disponibles en la vivienda', true, [
            { label: 'Agua segura / acueducto', value: 'agua' }, { label: 'Saneamiento / alcantarillado', value: 'saneamiento' }, { label: 'Energía eléctrica', value: 'energia' }, { label: 'Gas', value: 'gas' }, { label: 'Internet', value: 'internet' }, { label: 'Recolección de residuos', value: 'residuos' }, { label: 'Ninguno', value: 'ninguno' },
          ]),
        ],
      },
      consentPage('demo'),
    ],
  },
  {
    id: 'discapacidad-cuidados',
    title: 'Personas con discapacidad y redes de cuidado',
    description: 'Identifica tipo de discapacidad, apoyos, barreras, dependencia y situación de la persona cuidadora.',
    category: 'Protección especial',
    countries: ['LATAM'],
    recommendedFor: 'Secretarías de inclusión, salud, desarrollo social y organizaciones de discapacidad',
    type: 'ex_ante',
    pages: [
      locationPage('dis'),
      {
        id: 'dis_profile', title: 'Discapacidad, autonomía y apoyos', fields: [
          field('dis_age_range', 'select', 'Rango de edad', true, [
            { label: 'Primera infancia', value: '0_5' }, { label: 'Niñez', value: '6_11' }, { label: 'Adolescencia', value: '12_17' }, { label: 'Persona adulta', value: '18_59' }, { label: 'Persona mayor', value: '60_mas' },
          ]),
          field('dis_types', 'multi_select', 'Tipo de discapacidad reportada', true, [
            { label: 'Física', value: 'fisica' }, { label: 'Visual', value: 'visual' }, { label: 'Auditiva', value: 'auditiva' }, { label: 'Intelectual', value: 'intelectual' }, { label: 'Psicosocial', value: 'psicosocial' }, { label: 'Sordoceguera', value: 'sordoceguera' }, { label: 'Múltiple', value: 'multiple' },
          ]),
          field('dis_dependency', 'select', 'Nivel de apoyo requerido en actividades cotidianas', true, [
            { label: 'Independiente', value: 'independiente' }, { label: 'Apoyo ocasional', value: 'ocasional' }, { label: 'Apoyo frecuente', value: 'frecuente' }, { label: 'Apoyo permanente', value: 'permanente' },
          ]),
          field('dis_caregiver', 'radio', '¿Cuenta con una persona cuidadora principal?', true, yesNo),
          field('dis_health_access', 'select', 'Acceso actual a servicios de salud y rehabilitación', true, [
            { label: 'Adecuado', value: 'adecuado' }, { label: 'Parcial', value: 'parcial' }, { label: 'Sin acceso', value: 'sin_acceso' },
          ]),
          field('dis_barriers', 'multi_select', 'Principales barreras identificadas', true, [
            { label: 'Movilidad y espacio público', value: 'movilidad' }, { label: 'Transporte', value: 'transporte' }, { label: 'Comunicación', value: 'comunicacion' }, { label: 'Educación', value: 'educacion' }, { label: 'Empleo', value: 'empleo' }, { label: 'Salud', value: 'salud' }, { label: 'Actitudes o discriminación', value: 'actitudinal' },
          ]),
        ],
      },
      consentPage('dis'),
    ],
  },
  {
    id: 'etnica-comunitaria',
    title: 'Caracterización étnica y comunitaria',
    description: 'Autor reconocimiento, pertenencia comunitaria, prácticas culturales y necesidades priorizadas.',
    category: 'Protección especial',
    countries: ['LATAM'],
    recommendedFor: 'Programas de asuntos étnicos, participación ciudadana y desarrollo comunitario',
    type: 'ex_ante',
    pages: [
      locationPage('eth'),
      {
        id: 'eth_identity', title: 'Identidad y territorio', fields: [
          field('eth_group', 'select', 'Autorreconocimiento étnico o comunitario', true, [
            { label: 'Indígena', value: 'indigena' }, { label: 'Afrodescendiente / negro/a', value: 'afro' }, { label: 'Raizal', value: 'raizal' }, { label: 'Palenquero/a', value: 'palenquero' }, { label: 'Rrom / gitano/a', value: 'rrom' }, { label: 'Mestizo/a u otro', value: 'otro' }, { label: 'No responde', value: 'no_responde' },
          ]),
          field('eth_collective_territory', 'radio', '¿Reside o participa en un territorio colectivo, resguardo o comunidad reconocida?', true, yesNo),
          field('eth_language', 'radio', '¿Habla o comprende una lengua propia de su comunidad?', true, yesNo),
          field('eth_displacement', 'radio', '¿La permanencia en el territorio ha sido afectada por desplazamiento o movilidad forzada?', true, yesNo),
          field('eth_priorities', 'multi_select', 'Necesidades comunitarias prioritarias', true, [
            { label: 'Titulación o seguridad territorial', value: 'territorio' }, { label: 'Vivienda y servicios', value: 'vivienda' }, { label: 'Salud con enfoque diferencial', value: 'salud' }, { label: 'Educación propia', value: 'educacion' }, { label: 'Empleo e ingresos', value: 'ingresos' }, { label: 'Cultura y patrimonio', value: 'cultura' }, { label: 'Participación institucional', value: 'participacion' },
          ]),
        ],
      },
      consentPage('eth'),
    ],
  },
  {
    id: 'productiva-emprendimientos',
    title: 'Caracterización productiva y de emprendimientos',
    description: 'Perfil de unidades productivas, empleo, formalización, ventas, brechas y necesidades de fortalecimiento.',
    category: 'Economía y productividad',
    countries: ['LATAM'],
    recommendedFor: 'Secretarías de desarrollo económico, cámaras de comercio y programas de emprendimiento',
    type: 'ex_ante',
    pages: [
      locationPage('prod'),
      {
        id: 'prod_business', title: 'Unidad productiva', fields: [
          field('prod_sector', 'select', 'Sector económico principal', true, [
            { label: 'Comercio', value: 'comercio' }, { label: 'Servicios', value: 'servicios' }, { label: 'Manufactura', value: 'manufactura' }, { label: 'Agropecuario', value: 'agro' }, { label: 'Turismo', value: 'turismo' }, { label: 'Cultura y economía creativa', value: 'cultura' }, { label: 'Otro', value: 'otro' },
          ]),
          field('prod_formality', 'select', 'Nivel de formalización', true, [
            { label: 'Formal registrada', value: 'formal' }, { label: 'En proceso de formalización', value: 'proceso' }, { label: 'Informal', value: 'informal' },
          ]),
          field('prod_workers', 'number', 'Número de personas que trabajan en la unidad', true),
          field('prod_age', 'select', 'Antigüedad de la unidad productiva', true, [
            { label: 'Menos de 1 año', value: 'menos_1' }, { label: '1 a 3 años', value: '1_3' }, { label: '4 a 10 años', value: '4_10' }, { label: 'Más de 10 años', value: 'mas_10' },
          ]),
          field('prod_sales', 'select', 'Comportamiento reciente de ventas', true, [
            { label: 'Crecen', value: 'crecen' }, { label: 'Estables', value: 'estables' }, { label: 'Disminuyen', value: 'disminuyen' }, { label: 'No lleva registro', value: 'sin_registro' },
          ]),
          field('prod_needs', 'multi_select', 'Necesidades de fortalecimiento', true, [
            { label: 'Financiación', value: 'financiacion' }, { label: 'Formalización', value: 'formalizacion' }, { label: 'Comercialización', value: 'comercializacion' }, { label: 'Transformación digital', value: 'digital' }, { label: 'Capacitación técnica', value: 'tecnica' }, { label: 'Asociatividad', value: 'asociatividad' },
          ]),
        ],
      },
      consentPage('prod'),
    ],
  },
  {
    id: 'territorial-riesgo-servicios',
    title: 'Diagnóstico territorial, riesgo y servicios públicos',
    description: 'Barrido predio a predio para infraestructura, amenazas, habitabilidad y cobertura de servicios.',
    category: 'Territorio y riesgo',
    countries: ['LATAM'],
    recommendedFor: 'Gestión del riesgo, planeación, hábitat, servicios públicos y obras',
    type: 'ex_ante',
    pages: [
      locationPage('risk'),
      {
        id: 'risk_conditions', title: 'Condiciones del predio y el entorno', fields: [
          field('risk_use', 'select', 'Uso principal del predio o punto', true, [
            { label: 'Residencial', value: 'residencial' }, { label: 'Comercial', value: 'comercial' }, { label: 'Institucional', value: 'institucional' }, { label: 'Productivo', value: 'productivo' }, { label: 'Espacio público', value: 'espacio_publico' }, { label: 'Otro', value: 'otro' },
          ]),
          field('risk_hazards', 'multi_select', 'Amenazas o riesgos observados', true, [
            { label: 'Inundación', value: 'inundacion' }, { label: 'Deslizamiento', value: 'deslizamiento' }, { label: 'Erosión', value: 'erosion' }, { label: 'Incendio', value: 'incendio' }, { label: 'Contaminación', value: 'contaminacion' }, { label: 'Violencia o inseguridad', value: 'inseguridad' }, { label: 'Ninguno visible', value: 'ninguno' },
          ]),
          field('risk_water', 'select', 'Disponibilidad de agua segura', true, [
            { label: 'Continua', value: 'continua' }, { label: 'Intermitente', value: 'intermitente' }, { label: 'Fuente alternativa', value: 'alternativa' }, { label: 'Sin acceso', value: 'sin_acceso' },
          ]),
          field('risk_sanitation', 'select', 'Solución de saneamiento', true, [
            { label: 'Alcantarillado', value: 'alcantarillado' }, { label: 'Pozo séptico', value: 'septico' }, { label: 'Solución comunitaria', value: 'comunitaria' }, { label: 'Sin solución', value: 'sin_solucion' },
          ]),
          field('risk_energy', 'radio', '¿Cuenta con energía eléctrica segura?', true, yesNo),
          field('risk_road', 'select', 'Estado del acceso vial o peatonal', true, [
            { label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Deficiente', value: 'deficiente' }, { label: 'Sin acceso permanente', value: 'sin_acceso' },
          ]),
          field('risk_priority', 'select', 'Prioridad técnica preliminar', true, [
            { label: 'Baja', value: 'baja' }, { label: 'Media', value: 'media' }, { label: 'Alta', value: 'alta' }, { label: 'Atención inmediata', value: 'inmediata' },
          ]),
        ],
      },
      consentPage('risk'),
    ],
  },
  {
    id: 'rural-agropecuaria',
    title: 'Caracterización rural y agropecuaria',
    description: 'Unidad productiva rural, tenencia, cultivos, producción, agua, asistencia técnica y comercialización.',
    category: 'Economía y productividad',
    countries: ['LATAM'],
    recommendedFor: 'UMATA, secretarías de agricultura, asociaciones y proyectos de desarrollo rural',
    type: 'ex_ante',
    pages: [
      locationPage('rural'),
      {
        id: 'rural_unit', title: 'Unidad productiva rural', fields: [
          field('rural_tenure', 'select', 'Forma de tenencia de la tierra', true, [
            { label: 'Propiedad', value: 'propiedad' }, { label: 'Arriendo', value: 'arriendo' }, { label: 'Posesión', value: 'posesion' }, { label: 'Comodato', value: 'comodato' }, { label: 'Territorio colectivo', value: 'colectivo' }, { label: 'Otra', value: 'otra' },
          ]),
          field('rural_area', 'number', 'Área productiva aproximada en hectáreas', true),
          field('rural_lines', 'multi_select', 'Líneas productivas principales', true, [
            { label: 'Agricultura', value: 'agricultura' }, { label: 'Ganadería', value: 'ganaderia' }, { label: 'Pesca o acuicultura', value: 'pesca' }, { label: 'Avicultura', value: 'avicultura' }, { label: 'Apicultura', value: 'apicultura' }, { label: 'Forestal', value: 'forestal' }, { label: 'Transformación de alimentos', value: 'transformacion' },
          ]),
          field('rural_water', 'select', 'Acceso a agua para producción', true, [
            { label: 'Suficiente todo el año', value: 'suficiente' }, { label: 'Estacional', value: 'estacional' }, { label: 'Insuficiente', value: 'insuficiente' }, { label: 'Sin acceso', value: 'sin_acceso' },
          ]),
          field('rural_assistance', 'radio', '¿Recibió asistencia técnica durante los últimos 12 meses?', true, yesNo),
          field('rural_market', 'select', 'Canal principal de comercialización', true, [
            { label: 'Autoconsumo', value: 'autoconsumo' }, { label: 'Mercado local', value: 'local' }, { label: 'Intermediario', value: 'intermediario' }, { label: 'Asociación o cooperativa', value: 'asociacion' }, { label: 'Venta directa o digital', value: 'directa' },
          ]),
        ],
      },
      consentPage('rural'),
    ],
  },
  {
    id: 'cultura-deporte-turismo',
    title: 'Actores de cultura, deporte y turismo',
    description: 'Registro sectorial de personas, colectivos, escuelas, emprendimientos, capacidades y necesidades.',
    category: 'Oferta sectorial',
    countries: ['LATAM'],
    recommendedFor: 'Institutos de cultura, recreación, deporte y autoridades de turismo',
    type: 'ex_ante',
    pages: [
      locationPage('sector'),
      {
        id: 'sector_profile', title: 'Perfil del actor sectorial', fields: [
          field('sector_area', 'select', 'Sector principal', true, [
            { label: 'Cultura y patrimonio', value: 'cultura' }, { label: 'Deporte y recreación', value: 'deporte' }, { label: 'Turismo', value: 'turismo' }, { label: 'Artesanía', value: 'artesania' }, { label: 'Economía creativa', value: 'creativa' },
          ]),
          field('sector_actor', 'select', 'Tipo de actor', true, [
            { label: 'Persona independiente', value: 'persona' }, { label: 'Colectivo u organización', value: 'colectivo' }, { label: 'Empresa o emprendimiento', value: 'empresa' }, { label: 'Escuela o proceso formativo', value: 'escuela' }, { label: 'Operador o prestador', value: 'operador' },
          ]),
          field('sector_formal', 'select', 'Estado de formalización o reconocimiento', true, [
            { label: 'Formal / registrado', value: 'formal' }, { label: 'Comunitario reconocido', value: 'comunitario' }, { label: 'En proceso', value: 'proceso' }, { label: 'No formalizado', value: 'informal' },
          ]),
          field('sector_beneficiaries', 'number', 'Número aproximado de participantes o beneficiarios', true),
          field('sector_space', 'radio', '¿Cuenta con un espacio adecuado para desarrollar su actividad?', true, yesNo),
          field('sector_needs', 'multi_select', 'Necesidades principales', true, [
            { label: 'Infraestructura', value: 'infraestructura' }, { label: 'Dotación', value: 'dotacion' }, { label: 'Formación', value: 'formacion' }, { label: 'Circulación y promoción', value: 'promocion' }, { label: 'Financiación', value: 'financiacion' }, { label: 'Formalización', value: 'formalizacion' }, { label: 'Accesibilidad e inclusión', value: 'inclusion' },
          ]),
        ],
      },
      consentPage('sector'),
    ],
  },
  {
    id: 'ninez-adolescencia-proteccion',
    title: 'Niñez, adolescencia y entornos protectores',
    description: 'Caracterización de acceso a educación, cuidado, participación, riesgos y rutas de protección sin recopilar datos innecesarios.',
    category: 'Protección especial',
    countries: ['LATAM'],
    recommendedFor: 'Institutos de bienestar, educación, inclusión social y programas de prevención',
    type: 'ex_ante',
    pages: [
      locationPage('nna'),
      {
        id: 'nna_entorno', title: 'Entorno protector y acceso a derechos', fields: [
          field('nna_age_group', 'select', 'Grupo de edad de la población caracterizada', true, [
            { label: 'Primera infancia (0 a 5)', value: '0_5' }, { label: 'Niñez (6 a 11)', value: '6_11' }, { label: 'Adolescencia (12 a 17)', value: '12_17' },
          ]),
          field('nna_school', 'select', 'Situación educativa actual', true, [
            { label: 'Asiste regularmente', value: 'regular' }, { label: 'Asiste con interrupciones', value: 'intermitente' }, { label: 'No asiste', value: 'no_asiste' }, { label: 'No aplica por edad', value: 'no_aplica' },
          ]),
          field('nna_care_network', 'radio', '¿Cuenta con una red adulta de cuidado y apoyo?', true, yesNo),
          field('nna_safe_spaces', 'multi_select', 'Espacios protectores disponibles', true, [
            { label: 'Hogar', value: 'hogar' }, { label: 'Institución educativa', value: 'escuela' }, { label: 'Organización comunitaria', value: 'comunidad' }, { label: 'Deporte o cultura', value: 'deporte_cultura' }, { label: 'Ninguno identificado', value: 'ninguno' },
          ]),
          field('nna_risk_alert', 'select', 'Nivel de alerta observado según el protocolo institucional', true, [
            { label: 'Sin alerta', value: 'sin_alerta' }, { label: 'Requiere orientación', value: 'orientacion' }, { label: 'Requiere verificación prioritaria', value: 'prioritaria' }, { label: 'Activar ruta inmediata', value: 'inmediata' },
          ]),
          field('nna_referral', 'longtext', 'Remisión o actuación realizada, sin incluir diagnósticos no autorizados'),
        ],
      },
      consentPage('nna'),
    ],
  },
  {
    id: 'salud-publica-comunitaria',
    title: 'Salud pública y condiciones comunitarias',
    description: 'Diagnóstico agregado de acceso, prevención, agua, saneamiento y barreras de atención con enfoque territorial.',
    category: 'Salud pública',
    countries: ['LATAM'],
    recommendedFor: 'Secretarías de salud, equipos extramurales y proyectos de salud comunitaria',
    type: 'ex_ante',
    pages: [
      locationPage('salud'),
      {
        id: 'salud_acceso', title: 'Acceso y determinantes comunitarios', fields: [
          field('salud_coverage', 'select', 'Cobertura o afiliación declarada', true, [
            { label: 'Con cobertura activa', value: 'activa' }, { label: 'Cobertura no confirmada', value: 'no_confirmada' }, { label: 'Sin cobertura', value: 'sin_cobertura' }, { label: 'Prefiere no responder', value: 'no_responde' },
          ]),
          field('salud_access', 'select', 'Tiempo aproximado para acceder al servicio más cercano', true, [
            { label: 'Menos de 30 minutos', value: 'menos_30' }, { label: '30 a 60 minutos', value: '30_60' }, { label: 'Más de 60 minutos', value: 'mas_60' }, { label: 'Sin acceso regular', value: 'sin_acceso' },
          ]),
          field('salud_barriers', 'multi_select', 'Barreras principales de acceso', true, [
            { label: 'Distancia o transporte', value: 'transporte' }, { label: 'Costo', value: 'costo' }, { label: 'Disponibilidad de citas', value: 'citas' }, { label: 'Barreras culturales o lingüísticas', value: 'cultural' }, { label: 'Ninguna', value: 'ninguna' },
          ]),
          field('salud_water', 'select', 'Fuente principal de agua para consumo', true, [
            { label: 'Red segura', value: 'red' }, { label: 'Pozo o fuente protegida', value: 'protegida' }, { label: 'Fuente no protegida', value: 'no_protegida' }, { label: 'Abastecimiento móvil', value: 'movil' },
          ]),
          field('salud_prevention', 'multi_select', 'Acciones preventivas recibidas durante el último año', true, [
            { label: 'Vacunación', value: 'vacunacion' }, { label: 'Salud sexual y reproductiva', value: 'ssr' }, { label: 'Nutrición', value: 'nutricion' }, { label: 'Salud mental comunitaria', value: 'mental' }, { label: 'Ninguna', value: 'ninguna' },
          ]),
          field('salud_priority', 'select', 'Prioridad de seguimiento territorial', true, [
            { label: 'Rutinaria', value: 'rutinaria' }, { label: 'Preferente', value: 'preferente' }, { label: 'Urgente según protocolo', value: 'urgente' },
          ]),
        ],
      },
      consentPage('salud'),
    ],
  },
  {
    id: 'censo-beneficiarios-programas',
    title: 'Censo de beneficiarios y cobertura de programas',
    description: 'Registro operativo para elegibilidad, cobertura, atención recibida, brechas y seguimiento de metas institucionales.',
    category: 'Gestión institucional',
    countries: ['LATAM'],
    recommendedFor: 'Entidades territoriales, fondos, operadores y programas de inversión social',
    type: 'ex_ante',
    pages: [
      locationPage('censo'),
      {
        id: 'censo_programa', title: 'Cobertura y atención', fields: [
          field('censo_population_group', 'select', 'Grupo poblacional principal', true, [
            { label: 'Hogares', value: 'hogares' }, { label: 'Niñez y adolescencia', value: 'nna' }, { label: 'Juventud', value: 'juventud' }, { label: 'Personas mayores', value: 'mayores' }, { label: 'Población rural', value: 'rural' }, { label: 'Otro', value: 'otro' },
          ]),
          field('censo_program', 'text', 'Programa, proyecto o convocatoria', true),
          field('censo_entry', 'select', 'Canal de ingreso', true, [
            { label: 'Convocatoria abierta', value: 'convocatoria' }, { label: 'Remisión institucional', value: 'remision' }, { label: 'Búsqueda activa', value: 'busqueda' }, { label: 'Demanda espontánea', value: 'demanda' },
          ]),
          field('censo_eligibility', 'select', 'Resultado preliminar de criterios', true, [
            { label: 'Cumple', value: 'cumple' }, { label: 'Pendiente de soporte', value: 'pendiente' }, { label: 'No cumple', value: 'no_cumple' }, { label: 'Requiere validación', value: 'validacion' },
          ]),
          field('censo_services', 'multi_select', 'Componentes o servicios recibidos', true, [
            { label: 'Orientación', value: 'orientacion' }, { label: 'Formación', value: 'formacion' }, { label: 'Transferencia o incentivo', value: 'incentivo' }, { label: 'Asistencia técnica', value: 'asistencia' }, { label: 'Remisión', value: 'remision' }, { label: 'Aún no recibe', value: 'no_recibe' },
          ]),
          field('censo_followup', 'date', 'Fecha prevista de seguimiento'),
        ],
      },
      consentPage('censo'),
    ],
  },
]

export function cloneTemplatePages(template: ControlGFormTemplate) {
  return structuredClone(template.pages)
}
