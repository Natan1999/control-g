import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { GeoRecord } from '@/types/gis'

const GPKG_APPLICATION_ID = 0x47504b47
const GPKG_USER_VERSION = 10300
const MAX_EXPORT_RECORDS = 50_000

function validCoordinate(record: GeoRecord) {
  return Number.isFinite(record.latitude)
    && Number.isFinite(record.longitude)
    && record.latitude >= -90
    && record.latitude <= 90
    && record.longitude >= -180
    && record.longitude <= 180
    && !(record.latitude === 0 && record.longitude === 0)
}

/**
 * Encodes an OGC GeoPackageBinary point: GP header + little-endian WKB Point.
 * The output intentionally has no envelope because the table extent is stored
 * in gpkg_contents and the point itself already carries both coordinates.
 */
export function geoPackagePoint(longitude: number, latitude: number) {
  const bytes = new Uint8Array(29)
  const view = new DataView(bytes.buffer)
  bytes[0] = 0x47 // G
  bytes[1] = 0x50 // P
  bytes[2] = 0 // GeoPackageBinary version 1
  bytes[3] = 0x01 // standard geometry, little endian, no envelope
  view.setInt32(4, 4326, true)
  bytes[8] = 0x01 // WKB little endian
  view.setUint32(9, 1, true) // WKB Point
  view.setFloat64(13, longitude, true)
  view.setFloat64(21, latitude, true)
  return bytes
}

export async function buildPointGeoPackage(records: GeoRecord[]) {
  const safeRecords = records.filter(validCoordinate)
  if (!safeRecords.length) throw new Error('No hay puntos WGS84 válidos para exportar.')
  if (safeRecords.length > MAX_EXPORT_RECORDS) {
    throw new Error(`La exportación GeoPackage admite hasta ${MAX_EXPORT_RECORDS.toLocaleString('es-CO')} puntos por archivo.`)
  }

  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  const database = new SQL.Database()
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z')
  const longitudes = safeRecords.map(record => record.longitude)
  const latitudes = safeRecords.map(record => record.latitude)

  try {
    database.run(`
      PRAGMA application_id = ${GPKG_APPLICATION_ID};
      PRAGMA user_version = ${GPKG_USER_VERSION};
      PRAGMA foreign_keys = ON;

      CREATE TABLE gpkg_spatial_ref_sys (
        srs_name TEXT NOT NULL,
        srs_id INTEGER NOT NULL PRIMARY KEY,
        organization TEXT NOT NULL,
        organization_coordsys_id INTEGER NOT NULL,
        definition TEXT NOT NULL,
        description TEXT
      );
      CREATE TABLE gpkg_contents (
        table_name TEXT NOT NULL PRIMARY KEY,
        data_type TEXT NOT NULL,
        identifier TEXT UNIQUE,
        description TEXT DEFAULT '',
        last_change DATETIME NOT NULL,
        min_x DOUBLE,
        min_y DOUBLE,
        max_x DOUBLE,
        max_y DOUBLE,
        srs_id INTEGER,
        CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
      );
      CREATE TABLE gpkg_geometry_columns (
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        geometry_type_name TEXT NOT NULL,
        srs_id INTEGER NOT NULL,
        z TINYINT NOT NULL,
        m TINYINT NOT NULL,
        CONSTRAINT pk_geom_cols PRIMARY KEY (table_name, column_name),
        CONSTRAINT uk_gc_table_name UNIQUE (table_name),
        CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name),
        CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
      );
      CREATE TABLE control_g_captures (
        fid INTEGER PRIMARY KEY AUTOINCREMENT,
        geom POINT NOT NULL,
        control_g_id TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        pending_sync INTEGER NOT NULL DEFAULT 0,
        latitude_wgs84 REAL NOT NULL,
        longitude_wgs84 REAL NOT NULL
      );
      CREATE UNIQUE INDEX control_g_captures_id_idx ON control_g_captures(control_g_id);
    `)

    const spatialReference = database.prepare(`
      INSERT INTO gpkg_spatial_ref_sys
        (srs_name, srs_id, organization, organization_coordsys_id, definition, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    spatialReference.run(['Undefined Cartesian SRS', -1, 'NONE', -1, 'undefined', 'Undefined Cartesian coordinate reference system'])
    spatialReference.run(['Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'Undefined geographic coordinate reference system'])
    spatialReference.run([
      'WGS 84 geodetic',
      4326,
      'EPSG',
      4326,
      'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
      'Longitude/latitude coordinates used by Control G',
    ])
    spatialReference.free()

    database.run(
      `INSERT INTO gpkg_contents
        (table_name, data_type, identifier, description, last_change, min_x, min_y, max_x, max_y, srs_id)
       VALUES (?, 'features', ?, ?, ?, ?, ?, ?, ?, 4326)`,
      [
        'control_g_captures',
        'Control G - capturas',
        'Metadatos operativos y puntos WGS84 exportados desde Control G.',
        now,
        Math.min(...longitudes),
        Math.min(...latitudes),
        Math.max(...longitudes),
        Math.max(...latitudes),
      ],
    )
    database.run(
      `INSERT INTO gpkg_geometry_columns
        (table_name, column_name, geometry_type_name, srs_id, z, m)
       VALUES ('control_g_captures', 'geom', 'POINT', 4326, 0, 0)`,
    )

    const insert = database.prepare(`
      INSERT INTO control_g_captures
        (geom, control_g_id, source, status, captured_at, pending_sync, latitude_wgs84, longitude_wgs84)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    database.run('BEGIN')
    for (const record of safeRecords) {
      insert.run([
        geoPackagePoint(record.longitude, record.latitude),
        record.id,
        record.source,
        record.status,
        record.capturedAt,
        record.isPending ? 1 : 0,
        record.latitude,
        record.longitude,
      ])
    }
    database.run('COMMIT')
    insert.free()

    const integrity = database.exec('PRAGMA integrity_check')[0]?.values[0]?.[0]
    if (integrity !== 'ok') throw new Error('SQLite no pudo validar la integridad del GeoPackage.')
    return database.export()
  } finally {
    database.close()
  }
}
