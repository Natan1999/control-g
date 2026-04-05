/**
 * Control G — geographyService (DIVIPOLA / DANE Integration)
 *
 * Strategy (three tiers):
 *   1. DANE ArcGIS FeatureServer (official, may have CORS issues in browser)
 *   2. api-colombia.com (unofficial but reliable, JSON REST)
 *   3. Static fallback embedded in code (always works offline)
 */

const DANE_ARCGIS_BASE =
  'https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer';
const LAYER_DEPARTAMENTO = 319;
const LAYER_MUNICIPIO = 317;
const LAYER_CENTRO_POBLADO = 305;

const API_COLOMBIA_BASE = 'https://api-colombia.com/api/v1';

// ─── Static DIVIPOLA fallback — 33 entries (32 depts + Bogotá) ───────────────
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
  { id: '99', name: 'VICHADA' },
].sort((a, b) => a.name.localeCompare(b.name));

// Static municipalities per department (key municipalities for the most common departments)
// This serves as a reliable fallback when both APIs are unavailable (offline / CORS)
const STATIC_MUNICIPALITIES: Record<string, Municipality[]> = {
  '05': [
    { id: '05001', name: 'MEDELLÍN', departmentId: '05' },
    { id: '05002', name: 'ABEJORRAL', departmentId: '05' },
    { id: '05004', name: 'ABRIAQUÍ', departmentId: '05' },
    { id: '05021', name: 'ALEJANDRÍA', departmentId: '05' },
    { id: '05030', name: 'AMAGÁ', departmentId: '05' },
    { id: '05031', name: 'AMALFI', departmentId: '05' },
    { id: '05034', name: 'ANDES', departmentId: '05' },
    { id: '05036', name: 'ANGELÓPOLIS', departmentId: '05' },
    { id: '05038', name: 'ANGOSTURA', departmentId: '05' },
    { id: '05040', name: 'ANORÍ', departmentId: '05' },
    { id: '05044', name: 'ANZÁ', departmentId: '05' },
    { id: '05045', name: 'APARTADÓ', departmentId: '05' },
    { id: '05051', name: 'ARBOLETES', departmentId: '05' },
    { id: '05055', name: 'ARGELIA', departmentId: '05' },
    { id: '05059', name: 'ARMENIA', departmentId: '05' },
    { id: '05079', name: 'BARBOSA', departmentId: '05' },
    { id: '05088', name: 'BELLO', departmentId: '05' },
    { id: '05091', name: 'BETANIA', departmentId: '05' },
    { id: '05093', name: 'BETULIA', departmentId: '05' },
    { id: '05107', name: 'BURITICÁ', departmentId: '05' },
    { id: '05113', name: 'CÁCERES', departmentId: '05' },
    { id: '05120', name: 'CALDAS', departmentId: '05' },
    { id: '05125', name: 'CAMPAMENTO', departmentId: '05' },
    { id: '05129', name: 'CAÑASGORDAS', departmentId: '05' },
    { id: '05134', name: 'CARACOLÍ', departmentId: '05' },
    { id: '05138', name: 'CARAMANTA', departmentId: '05' },
    { id: '05142', name: 'CAREPA', departmentId: '05' },
    { id: '05145', name: 'CAROLINA', departmentId: '05' },
    { id: '05147', name: 'CAUCASIA', departmentId: '05' },
    { id: '05150', name: 'CHIGORODÓ', departmentId: '05' },
    { id: '05154', name: 'CISNEROS', departmentId: '05' },
    { id: '05172', name: 'CONCORDIA', departmentId: '05' },
    { id: '05190', name: 'COPACABANA', departmentId: '05' },
    { id: '05206', name: 'DABEIBA', departmentId: '05' },
    { id: '05209', name: 'DONMATÍAS', departmentId: '05' },
    { id: '05212', name: 'EBÉJICO', departmentId: '05' },
    { id: '05234', name: 'ENTRERRÍOS', departmentId: '05' },
    { id: '05237', name: 'ENVIGADO', departmentId: '05' },
    { id: '05240', name: 'FREDONIA', departmentId: '05' },
    { id: '05250', name: 'FRONTINO', departmentId: '05' },
    { id: '05264', name: 'GIRALDO', departmentId: '05' },
    { id: '05266', name: 'GIRARDOTA', departmentId: '05' },
    { id: '05282', name: 'GUADALUPE', departmentId: '05' },
    { id: '05284', name: 'GUARNE', departmentId: '05' },
    { id: '05306', name: 'HELICONIA', departmentId: '05' },
    { id: '05310', name: 'HISPANIA', departmentId: '05' },
    { id: '05313', name: 'ITAGÜÍ', departmentId: '05' },
    { id: '05315', name: 'ITUANGO', departmentId: '05' },
    { id: '05318', name: 'JARDÍN', departmentId: '05' },
    { id: '05321', name: 'JERICÓ', departmentId: '05' },
    { id: '05347', name: 'LA CEJA', departmentId: '05' },
    { id: '05353', name: 'LA ESTRELLA', departmentId: '05' },
    { id: '05360', name: 'LA PINTADA', departmentId: '05' },
    { id: '05361', name: 'LA UNIÓN', departmentId: '05' },
    { id: '05364', name: 'LIBORINA', departmentId: '05' },
    { id: '05368', name: 'MACEO', departmentId: '05' },
    { id: '05376', name: 'MARINILLA', departmentId: '05' },
    { id: '05390', name: 'MONTEBELLO', departmentId: '05' },
    { id: '05400', name: 'MURINDÓ', departmentId: '05' },
    { id: '05411', name: 'MUTATÁ', departmentId: '05' },
    { id: '05425', name: 'NARIÑO', departmentId: '05' },
    { id: '05440', name: 'NECOCLÍ', departmentId: '05' },
    { id: '05467', name: 'OLAYA', departmentId: '05' },
    { id: '05475', name: 'PEÑOL', departmentId: '05' },
    { id: '05480', name: 'PEQUE', departmentId: '05' },
    { id: '05495', name: 'PUEBLORRICO', departmentId: '05' },
    { id: '05501', name: 'PUERTO BERRÍO', departmentId: '05' },
    { id: '05541', name: 'REMEDIOS', departmentId: '05' },
    { id: '05543', name: 'RETIRO', departmentId: '05' },
    { id: '05576', name: 'SABANALARGA', departmentId: '05' },
    { id: '05579', name: 'SABANETA', departmentId: '05' },
    { id: '05585', name: 'SALGAR', departmentId: '05' },
    { id: '05607', name: 'SAN ANDRÉS DE CUERQUÍA', departmentId: '05' },
    { id: '05615', name: 'SAN CARLOS', departmentId: '05' },
    { id: '05628', name: 'SAN JERÓNIMO', departmentId: '05' },
    { id: '05631', name: 'SAN JOSÉ DE LA MONTAÑA', departmentId: '05' },
    { id: '05637', name: 'SAN LUIS', departmentId: '05' },
    { id: '05647', name: 'SAN PEDRO DE LOS MILAGROS', departmentId: '05' },
    { id: '05649', name: 'SAN PEDRO DE URABÁ', departmentId: '05' },
    { id: '05652', name: 'SAN RAFAEL', departmentId: '05' },
    { id: '05656', name: 'SAN ROQUE', departmentId: '05' },
    { id: '05658', name: 'SAN VICENTE', departmentId: '05' },
    { id: '05659', name: 'SANTA BÁRBARA', departmentId: '05' },
    { id: '05660', name: 'SANTA ROSA DE OSOS', departmentId: '05' },
    { id: '05665', name: 'SANTO DOMINGO', departmentId: '05' },
    { id: '05667', name: 'EL SANTUARIO', departmentId: '05' },
    { id: '05670', name: 'SEGOVIA', departmentId: '05' },
    { id: '05674', name: 'SONSÓN', departmentId: '05' },
    { id: '05679', name: 'SOPETRÁN', departmentId: '05' },
    { id: '05686', name: 'TÁMESIS', departmentId: '05' },
    { id: '05690', name: 'TARAZÁ', departmentId: '05' },
    { id: '05697', name: 'TARSO', departmentId: '05' },
    { id: '05736', name: 'TITIRIBÍ', departmentId: '05' },
    { id: '05756', name: 'TOLEDO', departmentId: '05' },
    { id: '05761', name: 'TURBO', departmentId: '05' },
    { id: '05789', name: 'URAMITA', departmentId: '05' },
    { id: '05790', name: 'URRAO', departmentId: '05' },
    { id: '05792', name: 'VALDIVIA', departmentId: '05' },
    { id: '05809', name: 'VEGACHÍ', departmentId: '05' },
    { id: '05819', name: 'VENECIA', departmentId: '05' },
    { id: '05837', name: 'VIGÍA DEL FUERTE', departmentId: '05' },
    { id: '05842', name: 'YALÍ', departmentId: '05' },
    { id: '05847', name: 'YARUMAL', departmentId: '05' },
    { id: '05854', name: 'YOLOMBÓ', departmentId: '05' },
    { id: '05856', name: 'YONDÓ', departmentId: '05' },
    { id: '05858', name: 'ZARAGOZA', departmentId: '05' },
  ],
  '08': [
    { id: '08001', name: 'BARRANQUILLA', departmentId: '08' },
    { id: '08078', name: 'BARANOA', departmentId: '08' },
    { id: '08137', name: 'CAMPO DE LA CRUZ', departmentId: '08' },
    { id: '08141', name: 'CANDELARIA', departmentId: '08' },
    { id: '08296', name: 'GALAPA', departmentId: '08' },
    { id: '08372', name: 'JUAN DE ACOSTA', departmentId: '08' },
    { id: '08421', name: 'LURUACO', departmentId: '08' },
    { id: '08433', name: 'MALAMBO', departmentId: '08' },
    { id: '08436', name: 'MANATÍ', departmentId: '08' },
    { id: '08520', name: 'PALMAR DE VARELA', departmentId: '08' },
    { id: '08549', name: 'PIOJÓ', departmentId: '08' },
    { id: '08558', name: 'POLONUEVO', departmentId: '08' },
    { id: '08560', name: 'PONEDERA', departmentId: '08' },
    { id: '08573', name: 'PUERTO COLOMBIA', departmentId: '08' },
    { id: '08606', name: 'REPELÓN', departmentId: '08' },
    { id: '08634', name: 'SABANAGRANDE', departmentId: '08' },
    { id: '08638', name: 'SABANALARGA', departmentId: '08' },
    { id: '08675', name: 'SANTA LUCÍA', departmentId: '08' },
    { id: '08685', name: 'SANTO TOMÁS', departmentId: '08' },
    { id: '08758', name: 'SOLEDAD', departmentId: '08' },
    { id: '08770', name: 'SUÁN', departmentId: '08' },
    { id: '08832', name: 'TUBARÁ', departmentId: '08' },
    { id: '08849', name: 'USIACURÍ', departmentId: '08' },
  ],
  '11': [{ id: '11001', name: 'BOGOTÁ, D.C.', departmentId: '11' }],
  '13': [
    { id: '13001', name: 'CARTAGENA DE INDIAS', departmentId: '13' },
    { id: '13006', name: 'ACHÍ', departmentId: '13' },
    { id: '13030', name: 'ALTOS DEL ROSARIO', departmentId: '13' },
    { id: '13042', name: 'ARENAL', departmentId: '13' },
    { id: '13052', name: 'ARJONA', departmentId: '13' },
    { id: '13062', name: 'ARROYOHONDO', departmentId: '13' },
    { id: '13074', name: 'BARRANCO DE LOBA', departmentId: '13' },
    { id: '13140', name: 'CALAMAR', departmentId: '13' },
    { id: '13160', name: 'CANTAGALLO', departmentId: '13' },
    { id: '13188', name: 'CICUCO', departmentId: '13' },
    { id: '13212', name: 'CÓRDOBA', departmentId: '13' },
    { id: '13222', name: 'CLEMENCIA', departmentId: '13' },
    { id: '13244', name: 'EL CARMEN DE BOLÍVAR', departmentId: '13' },
    { id: '13248', name: 'EL GUAMO', departmentId: '13' },
    { id: '13268', name: 'EL PEÑÓN', departmentId: '13' },
    { id: '13300', name: 'HATILLO DE LOBA', departmentId: '13' },
    { id: '13430', name: 'MAGANGUÉ', departmentId: '13' },
    { id: '13433', name: 'MAHATES', departmentId: '13' },
    { id: '13440', name: 'MARGARITA', departmentId: '13' },
    { id: '13442', name: 'MARÍA LA BAJA', departmentId: '13' },
    { id: '13458', name: 'MONTECRISTO', departmentId: '13' },
    { id: '13468', name: 'MOMPÓS', departmentId: '13' },
    { id: '13473', name: 'MORALES', departmentId: '13' },
    { id: '13490', name: 'NOROSÍ', departmentId: '13' },
    { id: '13549', name: 'PINILLOS', departmentId: '13' },
    { id: '13580', name: 'REGIDOR', departmentId: '13' },
    { id: '13600', name: 'RÍO VIEJO', departmentId: '13' },
    { id: '13620', name: 'SAN CRISTÓBAL', departmentId: '13' },
    { id: '13647', name: 'SAN ESTANISLAO', departmentId: '13' },
    { id: '13650', name: 'SAN FERNANDO', departmentId: '13' },
    { id: '13654', name: 'SAN JACINTO', departmentId: '13' },
    { id: '13655', name: 'SAN JACINTO DEL CAUCA', departmentId: '13' },
    { id: '13657', name: 'SAN JUAN NEPOMUCENO', departmentId: '13' },
    { id: '13667', name: 'SAN MARTÍN DE LOBA', departmentId: '13' },
    { id: '13670', name: 'SAN PABLO', departmentId: '13' },
    { id: '13673', name: 'SANTA CATALINA', departmentId: '13' },
    { id: '13683', name: 'SANTA ROSA', departmentId: '13' },
    { id: '13688', name: 'SANTA ROSA DEL SUR', departmentId: '13' },
    { id: '13744', name: 'SIMITÍ', departmentId: '13' },
    { id: '13760', name: 'SOPLAVIENTO', departmentId: '13' },
    { id: '13780', name: 'TALAIGUA NUEVO', departmentId: '13' },
    { id: '13810', name: 'TIQUISIO', departmentId: '13' },
    { id: '13836', name: 'TURBACO', departmentId: '13' },
    { id: '13838', name: 'TURBANÁ', departmentId: '13' },
    { id: '13873', name: 'VILLANUEVA', departmentId: '13' },
    { id: '13894', name: 'ZAMBRANO', departmentId: '13' },
  ],
  '15': [
    { id: '15001', name: 'TUNJA', departmentId: '15' },
    { id: '15022', name: 'ALMEIDA', departmentId: '15' },
    { id: '15047', name: 'AQUITANIA', departmentId: '15' },
    { id: '15051', name: 'ARCABUCO', departmentId: '15' },
    { id: '15087', name: 'BELÉN', departmentId: '15' },
    { id: '15090', name: 'BERBEO', departmentId: '15' },
    { id: '15092', name: 'BETÉITIVA', departmentId: '15' },
    { id: '15097', name: 'BOAVITA', departmentId: '15' },
    { id: '15104', name: 'BOYACÁ', departmentId: '15' },
    { id: '15106', name: 'BRICEÑO', departmentId: '15' },
    { id: '15109', name: 'BUENAVISTA', departmentId: '15' },
    { id: '15114', name: 'BUSBANZÁ', departmentId: '15' },
    { id: '15131', name: 'CALDAS', departmentId: '15' },
    { id: '15135', name: 'CAMPOHERMOSO', departmentId: '15' },
    { id: '15162', name: 'CERINZA', departmentId: '15' },
    { id: '15172', name: 'CIÉNEGA', departmentId: '15' },
    { id: '15176', name: 'CÓMBITA', departmentId: '15' },
    { id: '15180', name: 'COPER', departmentId: '15' },
    { id: '15183', name: 'CORRALES', departmentId: '15' },
    { id: '15185', name: 'COVARACHÍA', departmentId: '15' },
    { id: '15187', name: 'CUBARÁ', departmentId: '15' },
    { id: '15189', name: 'CUCAITA', departmentId: '15' },
    { id: '15204', name: 'DUITAMA', departmentId: '15' },
    { id: '15212', name: 'EL COCUY', departmentId: '15' },
    { id: '15215', name: 'EL ESPINO', departmentId: '15' },
    { id: '15218', name: 'FIRAVITOBA', departmentId: '15' },
    { id: '15224', name: 'FLORESTA', departmentId: '15' },
    { id: '15238', name: 'GACHANTIVÁ', departmentId: '15' },
    { id: '15244', name: 'GÁMEZA', departmentId: '15' },
    { id: '15248', name: 'GARAGOA', departmentId: '15' },
    { id: '15272', name: 'GUACAMAYAS', departmentId: '15' },
    { id: '15276', name: 'GUATEQUE', departmentId: '15' },
    { id: '15293', name: 'IZA', departmentId: '15' },
    { id: '15296', name: 'JENESANO', departmentId: '15' },
    { id: '15299', name: 'JERICÓ', departmentId: '15' },
    { id: '15317', name: 'LABRANZAGRANDE', departmentId: '15' },
    { id: '15322', name: 'LA CAPILLA', departmentId: '15' },
    { id: '15325', name: 'LA VICTORIA', departmentId: '15' },
    { id: '15332', name: 'LEYVA', departmentId: '15' },
    { id: '15362', name: 'MACANAL', departmentId: '15' },
    { id: '15367', name: 'MARIPÍ', departmentId: '15' },
    { id: '15380', name: 'MIRAFLORES', departmentId: '15' },
    { id: '15403', name: 'MONGUA', departmentId: '15' },
    { id: '15407', name: 'MONGUÍ', departmentId: '15' },
    { id: '15425', name: 'MOTAVITA', departmentId: '15' },
    { id: '15442', name: 'MUZO', departmentId: '15' },
    { id: '15455', name: 'NOBSA', departmentId: '15' },
    { id: '15464', name: 'NUEVO COLÓN', departmentId: '15' },
    { id: '15469', name: 'OICATÁ', departmentId: '15' },
    { id: '15476', name: 'OTANCHE', departmentId: '15' },
    { id: '15480', name: 'PACHAVITA', departmentId: '15' },
    { id: '15491', name: 'PÁEZ', departmentId: '15' },
    { id: '15494', name: 'PAIPA', departmentId: '15' },
    { id: '15500', name: 'PAJARITO', departmentId: '15' },
    { id: '15507', name: 'PANQUEBA', departmentId: '15' },
    { id: '15511', name: 'PAUNA', departmentId: '15' },
    { id: '15514', name: 'PAYA', departmentId: '15' },
    { id: '15516', name: 'PAZ DE RÍO', departmentId: '15' },
    { id: '15518', name: 'PESCA', departmentId: '15' },
    { id: '15522', name: 'PISBA', departmentId: '15' },
    { id: '15531', name: 'PUERTO BOYACÁ', departmentId: '15' },
    { id: '15572', name: 'QUÍPAMA', departmentId: '15' },
    { id: '15580', name: 'RAMIRIQUÍ', departmentId: '15' },
    { id: '15599', name: 'RONDÓN', departmentId: '15' },
    { id: '15600', name: 'SABOYÁ', departmentId: '15' },
    { id: '15621', name: 'SÁCHICA', departmentId: '15' },
    { id: '15632', name: 'SAMACÁ', departmentId: '15' },
    { id: '15646', name: 'SAN EDUARDO', departmentId: '15' },
    { id: '15660', name: 'SAN JOSÉ DE PARE', departmentId: '15' },
    { id: '15664', name: 'SAN LUIS DE GACENO', departmentId: '15' },
    { id: '15667', name: 'SAN MATEO', departmentId: '15' },
    { id: '15673', name: 'SAN MIGUEL DE SEMA', departmentId: '15' },
    { id: '15676', name: 'SAN PABLO DE BORBUR', departmentId: '15' },
    { id: '15681', name: 'SANTA MARÍA', departmentId: '15' },
    { id: '15686', name: 'SANTA ROSA DE VITERBO', departmentId: '15' },
    { id: '15690', name: 'SANTA SOFÍA', departmentId: '15' },
    { id: '15693', name: 'SANTANA', departmentId: '15' },
    { id: '15696', name: 'SATIVANORTE', departmentId: '15' },
    { id: '15720', name: 'SIACHOQUE', departmentId: '15' },
    { id: '15740', name: 'SOATÁ', departmentId: '15' },
    { id: '15753', name: 'SOCOTÁ', departmentId: '15' },
    { id: '15755', name: 'SOCHA', departmentId: '15' },
    { id: '15757', name: 'SOGAMOSO', departmentId: '15' },
    { id: '15759', name: 'SOMONDOCO', departmentId: '15' },
    { id: '15761', name: 'SORA', departmentId: '15' },
    { id: '15762', name: 'SORACÁ', departmentId: '15' },
    { id: '15763', name: 'SOTAQUIRÁ', departmentId: '15' },
    { id: '15774', name: 'SUSACÓN', departmentId: '15' },
    { id: '15776', name: 'SUTAMARCHÁN', departmentId: '15' },
    { id: '15778', name: 'SUTATENZA', departmentId: '15' },
    { id: '15790', name: 'TASCO', departmentId: '15' },
    { id: '15798', name: 'TENZA', departmentId: '15' },
    { id: '15804', name: 'TIBANÁ', departmentId: '15' },
    { id: '15806', name: 'TIBASOSA', departmentId: '15' },
    { id: '15808', name: 'TINJACÁ', departmentId: '15' },
    { id: '15810', name: 'TIPACOQUE', departmentId: '15' },
    { id: '15814', name: 'TOCA', departmentId: '15' },
    { id: '15820', name: 'TOGÜÍ', departmentId: '15' },
    { id: '15822', name: 'TÓPAGA', departmentId: '15' },
    { id: '15832', name: 'TOTA', departmentId: '15' },
    { id: '15835', name: 'TUNUNGUÁ', departmentId: '15' },
    { id: '15837', name: 'TURMEQUÉ', departmentId: '15' },
    { id: '15839', name: 'TUTA', departmentId: '15' },
    { id: '15842', name: 'TUTAZÁ', departmentId: '15' },
    { id: '15861', name: 'ÚMBITA', departmentId: '15' },
    { id: '15879', name: 'VENTAQUEMADA', departmentId: '15' },
    { id: '15897', name: 'VILLA DE LEYVA', departmentId: '15' },
    { id: '15899', name: 'VIRACACHÁ', departmentId: '15' },
    { id: '15902', name: 'ZETAQUIRA', departmentId: '15' },
  ],
  '68': [
    { id: '68001', name: 'BUCARAMANGA', departmentId: '68' },
    { id: '68013', name: 'AGUADA', departmentId: '68' },
    { id: '68020', name: 'ALBANIA', departmentId: '68' },
    { id: '68051', name: 'ARATOCA', departmentId: '68' },
    { id: '68077', name: 'BARBOSA', departmentId: '68' },
    { id: '68079', name: 'BARICHARA', departmentId: '68' },
    { id: '68081', name: 'BARRANCABERMEJA', departmentId: '68' },
    { id: '68092', name: 'BETULIA', departmentId: '68' },
    { id: '68101', name: 'BOLÍVAR', departmentId: '68' },
    { id: '68121', name: 'CABRERA', departmentId: '68' },
    { id: '68132', name: 'CALIFORNIA', departmentId: '68' },
    { id: '68147', name: 'CHARALÁ', departmentId: '68' },
    { id: '68152', name: 'CHIMA', departmentId: '68' },
    { id: '68160', name: 'CHIPATÁ', departmentId: '68' },
    { id: '68162', name: 'CIMITARRA', departmentId: '68' },
    { id: '68167', name: 'CONCEPCIÓN', departmentId: '68' },
    { id: '68169', name: 'CONFINES', departmentId: '68' },
    { id: '68176', name: 'CONTRATACIÓN', departmentId: '68' },
    { id: '68179', name: 'COROMORO', departmentId: '68' },
    { id: '68190', name: 'CURITÍ', departmentId: '68' },
    { id: '68207', name: 'EL CARMEN DE CHUCURÍ', departmentId: '68' },
    { id: '68209', name: 'EL GUACAMAYO', departmentId: '68' },
    { id: '68211', name: 'EL PEÑÓN', departmentId: '68' },
    { id: '68217', name: 'EL PLAYÓN', departmentId: '68' },
    { id: '68229', name: 'ENCINO', departmentId: '68' },
    { id: '68235', name: 'ENCISO', departmentId: '68' },
    { id: '68245', name: 'FLORIÁN', departmentId: '68' },
    { id: '68255', name: 'FLORIDABLANCA', departmentId: '68' },
    { id: '68264', name: 'GALÁN', departmentId: '68' },
    { id: '68266', name: 'GÁMBITA', departmentId: '68' },
    { id: '68271', name: 'GIRÓN', departmentId: '68' },
    { id: '68276', name: 'GUACA', departmentId: '68' },
    { id: '68296', name: 'GUADALUPE', departmentId: '68' },
    { id: '68298', name: 'GUAPOTÁ', departmentId: '68' },
    { id: '68307', name: 'GUAVATÁ', departmentId: '68' },
    { id: '68318', name: 'GÜEPSA', departmentId: '68' },
    { id: '68320', name: 'HATO', departmentId: '68' },
    { id: '68322', name: 'JESÚS MARÍA', departmentId: '68' },
    { id: '68324', name: 'JORDÁN', departmentId: '68' },
    { id: '68327', name: 'LA BELLEZA', departmentId: '68' },
    { id: '68344', name: 'LANDÁZURI', departmentId: '68' },
    { id: '68368', name: 'LA PAZ', departmentId: '68' },
    { id: '68370', name: 'LEBRÍJA', departmentId: '68' },
    { id: '68377', name: 'LOS SANTOS', departmentId: '68' },
    { id: '68385', name: 'MACARAVITA', departmentId: '68' },
    { id: '68406', name: 'MÁLAGA', departmentId: '68' },
    { id: '68418', name: 'MATANZA', departmentId: '68' },
    { id: '68425', name: 'MOGOTES', departmentId: '68' },
    { id: '68432', name: 'MOLAGAVITA', departmentId: '68' },
    { id: '68444', name: 'OCAMONTE', departmentId: '68' },
    { id: '68468', name: 'ONZAGA', departmentId: '68' },
    { id: '68498', name: 'PALMAR', departmentId: '68' },
    { id: '68500', name: 'PALMAS DEL SOCORRO', departmentId: '68' },
    { id: '68524', name: 'PÁRAMO', departmentId: '68' },
    { id: '68533', name: 'PIEDECUESTA', departmentId: '68' },
    { id: '68547', name: 'PINCHOTE', departmentId: '68' },
    { id: '68572', name: 'PUENTE NACIONAL', departmentId: '68' },
    { id: '68573', name: 'PUERTO PARRA', departmentId: '68' },
    { id: '68575', name: 'PUERTO WILCHES', departmentId: '68' },
    { id: '68615', name: 'RIONEGRO', departmentId: '68' },
    { id: '68655', name: 'SABANA DE TORRES', departmentId: '68' },
    { id: '68669', name: 'SAN ANDRÉS', departmentId: '68' },
    { id: '68673', name: 'SAN BENITO', departmentId: '68' },
    { id: '68679', name: 'SAN GIL', departmentId: '68' },
    { id: '68682', name: 'SAN JOAQUÍN', departmentId: '68' },
    { id: '68684', name: 'SAN JOSÉ DE MIRANDA', departmentId: '68' },
    { id: '68686', name: 'SAN MIGUEL', departmentId: '68' },
    { id: '68689', name: 'SAN VICENTE DE CHUCURÍ', departmentId: '68' },
    { id: '68705', name: 'SANTA BÁRBARA', departmentId: '68' },
    { id: '68720', name: 'SANTA HELENA DEL OPÓN', departmentId: '68' },
    { id: '68745', name: 'SIMACOTA', departmentId: '68' },
    { id: '68755', name: 'SOCORRO', departmentId: '68' },
    { id: '68770', name: 'SUAITA', departmentId: '68' },
    { id: '68773', name: 'SUCRE', departmentId: '68' },
    { id: '68780', name: 'SURATÁ', departmentId: '68' },
    { id: '68820', name: 'TONA', departmentId: '68' },
    { id: '68855', name: 'VÉLEZ', departmentId: '68' },
    { id: '68861', name: 'VETAS', departmentId: '68' },
    { id: '68867', name: 'VILLANUEVA', departmentId: '68' },
    { id: '68872', name: 'ZAPATOCA', departmentId: '68' },
  ],
  '76': [
    { id: '76001', name: 'CALI', departmentId: '76' },
    { id: '76020', name: 'ALCALÁ', departmentId: '76' },
    { id: '76036', name: 'ANDALUCÍA', departmentId: '76' },
    { id: '76041', name: 'ANSERMANUEVO', departmentId: '76' },
    { id: '76054', name: 'ARGELIA', departmentId: '76' },
    { id: '76100', name: 'BOLÍVAR', departmentId: '76' },
    { id: '76109', name: 'BUENAVENTURA', departmentId: '76' },
    { id: '76111', name: 'GUADALAJARA DE BUGA', departmentId: '76' },
    { id: '76113', name: 'BUGALAGRANDE', departmentId: '76' },
    { id: '76122', name: 'CAICEDONIA', departmentId: '76' },
    { id: '76130', name: 'CALIMA', departmentId: '76' },
    { id: '76147', name: 'CARTAGO', departmentId: '76' },
    { id: '76233', name: 'DAGUA', departmentId: '76' },
    { id: '76243', name: 'EL ÁGUILA', departmentId: '76' },
    { id: '76246', name: 'EL CAIRO', departmentId: '76' },
    { id: '76248', name: 'EL CERRITO', departmentId: '76' },
    { id: '76250', name: 'EL DOVIO', departmentId: '76' },
    { id: '76275', name: 'FLORIDA', departmentId: '76' },
    { id: '76306', name: 'GINEBRA', departmentId: '76' },
    { id: '76318', name: 'GUACARÍ', departmentId: '76' },
    { id: '76364', name: 'JAMUNDÍ', departmentId: '76' },
    { id: '76377', name: 'LA CUMBRE', departmentId: '76' },
    { id: '76400', name: 'LA UNIÓN', departmentId: '76' },
    { id: '76403', name: 'LA VICTORIA', departmentId: '76' },
    { id: '76497', name: 'OBANDO', departmentId: '76' },
    { id: '76520', name: 'PALMIRA', departmentId: '76' },
    { id: '76563', name: 'PRADERA', departmentId: '76' },
    { id: '76606', name: 'RESTREPO', departmentId: '76' },
    { id: '76616', name: 'RIOFRÍO', departmentId: '76' },
    { id: '76622', name: 'ROLDANILLO', departmentId: '76' },
    { id: '76670', name: 'SAN PEDRO', departmentId: '76' },
    { id: '76736', name: 'SEVILLA', departmentId: '76' },
    { id: '76823', name: 'TORO', departmentId: '76' },
    { id: '76828', name: 'TRUJILLO', departmentId: '76' },
    { id: '76834', name: 'TULUÁ', departmentId: '76' },
    { id: '76845', name: 'ULLOA', departmentId: '76' },
    { id: '76863', name: 'VERSALLES', departmentId: '76' },
    { id: '76869', name: 'VIJES', departmentId: '76' },
    { id: '76890', name: 'YOTOCO', departmentId: '76' },
    { id: '76892', name: 'YUMBO', departmentId: '76' },
    { id: '76895', name: 'ZARZAL', departmentId: '76' },
  ],
};

// ─── Cache ────────────────────────────────────────────────────────────────────
const _deptCache: Department[] | null = null;
const _muniCache: Record<string, Municipality[]> = {};

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

// ─── Departments ─────────────────────────────────────────────────────────────

export async function getDepartments(): Promise<Department[]> {
  if (_deptCache) return _deptCache;

  // Check localStorage cache first
  const cached = localStorage.getItem('divipola_departments');
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
  }

  // Tier 1: DANE ArcGIS
  try {
    const params = new URLSearchParams({ where: '1=1', outFields: 'DPTO_CCDGO,DPTO_CNMBRE', f: 'json' });
    const res = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_DEPARTAMENTO}/query?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('DANE ArcGIS no responde');
    const data = await res.json();
    if (!data.features?.length) throw new Error('Sin datos DANE');
    const map = new Map<string, Department>();
    data.features.forEach((f: any) => {
      const id = f.attributes.DPTO_CCDGO;
      const name = f.attributes.DPTO_CNMBRE;
      if (id && name && !map.has(id)) map.set(id, { id, name: name.toUpperCase().trim() });
    });
    const result = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (result.length > 0) {
      localStorage.setItem('divipola_departments', JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.warn('DANE ArcGIS depts failed:', (e as Error).message);
  }

  // Tier 2: api-colombia.com
  try {
    const res = await fetch(`${API_COLOMBIA_BASE}/Department`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('api-colombia no responde');
    const data: any[] = await res.json();
    const result: Department[] = data.map((d: any) => ({
      id: String(d.id).padStart(2, '0'),
      name: (d.name ?? d.nombre ?? '').toUpperCase().trim(),
    })).filter(d => d.id && d.name).sort((a, b) => a.name.localeCompare(b.name));
    if (result.length > 0) {
      localStorage.setItem('divipola_departments', JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.warn('api-colombia depts failed:', (e as Error).message);
  }

  // Tier 3: Static fallback
  return COLOMBIA_DEPARTMENTS;
}

// ─── Municipalities ───────────────────────────────────────────────────────────

export async function getMunicipalities(departmentId: string): Promise<Municipality[]> {
  if (!departmentId) return [];

  if (_muniCache[departmentId]) return _muniCache[departmentId];

  // Check localStorage cache
  const cacheKey = `divipola_munis_${departmentId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      _muniCache[departmentId] = parsed;
      return parsed;
    } catch { /* ignore */ }
  }

  // Tier 1: DANE ArcGIS
  try {
    const params = new URLSearchParams({
      where: `DPTO_CCDGO = '${departmentId}'`,
      outFields: 'MPIO_CCDGO,MPIO_CNMBRE,DPTO_CCDGO',
      orderByFields: 'MPIO_CNMBRE ASC',
      f: 'json',
    });
    const res = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_MUNICIPIO}/query?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('DANE municipios no responde');
    const data = await res.json();
    if (!data.features?.length) throw new Error('Sin municipios DANE');
    const map = new Map<string, Municipality>();
    data.features.forEach((f: any) => {
      const id = f.attributes.MPIO_CCDGO;
      const name = f.attributes.MPIO_CNMBRE;
      const deptId = f.attributes.DPTO_CCDGO;
      if (!map.has(id)) map.set(id, { id, name, departmentId: deptId });
    });
    const result = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (result.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(result));
      _muniCache[departmentId] = result;
      return result;
    }
  } catch (e) {
    console.warn(`DANE ArcGIS munis[${departmentId}] failed:`, (e as Error).message);
  }

  // Tier 2: api-colombia.com
  try {
    // api-colombia uses numeric ids — find the numeric id from our static list
    const numId = parseInt(departmentId, 10);
    const res = await fetch(`${API_COLOMBIA_BASE}/Department/${numId}/cities`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('api-colombia munis no responde');
    const data: any[] = await res.json();
    const result: Municipality[] = data.map((c: any) => ({
      id: String(c.id ?? c.codigoDane ?? '').padStart(5, '0'),
      name: (c.name ?? c.nombre ?? '').toUpperCase().trim(),
      departmentId,
    })).filter(m => m.id && m.name).sort((a, b) => a.name.localeCompare(b.name));
    if (result.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(result));
      _muniCache[departmentId] = result;
      return result;
    }
  } catch (e) {
    console.warn(`api-colombia munis[${departmentId}] failed:`, (e as Error).message);
  }

  // Tier 3: Static fallback
  const staticResult = STATIC_MUNICIPALITIES[departmentId] ?? [];
  if (staticResult.length > 0) {
    _muniCache[departmentId] = staticResult;
  }
  return staticResult;
}

// ─── Centros poblados ─────────────────────────────────────────────────────────

export async function getSettlements(municipalityId: string): Promise<Settlement[]> {
  if (!municipalityId) return [];
  try {
    const params = new URLSearchParams({
      where: `MPIO_CCDGO = '${municipalityId}'`,
      outFields: 'CP_CCDGO,CP_CNMBRE,MPIO_CCDGO',
      orderByFields: 'CP_CNMBRE ASC',
      f: 'json',
    });
    const res = await fetch(`${DANE_ARCGIS_BASE}/${LAYER_CENTRO_POBLADO}/query?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('DANE centros poblados no responde');
    const data = await res.json();
    return (data.features ?? []).map((f: any) => ({
      id: f.attributes.CP_CCDGO,
      name: f.attributes.CP_CNMBRE,
      municipalityId: f.attributes.MPIO_CCDGO,
    }));
  } catch (e) {
    console.warn(`Centros poblados[${municipalityId}] failed:`, (e as Error).message);
    return [];
  }
}
