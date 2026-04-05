/**
 * Control G — Local IndexedDB via Dexie.js
 * Stores activities, characterizations, and media for offline-first operation.
 */
import Dexie, { type Table } from 'dexie';

// ─── Family Member (per characterization) ────────────────────────────────────

export interface FamilyMember {
  id: string;                        // UUID local
  familyBond: string;                // Tabla A
  sex: 'hombre' | 'mujer';          // Tabla B
  genderIdentity: string;            // Tabla C
  sexualOrientation: string;         // Tabla D
  educationLevel: string;            // Tabla E
  ethnicGroup: string;               // Tabla F
  disability: string;                // Tabla G
  specialCondition: string;          // Tabla H
  peaceApproach: string;             // Tabla I
  maritalStatus: string;             // Tabla J
  leadershipType: string | null;     // Tabla K
  birthDate: string;                 // ISO date string YYYY-MM-DD
  calculatedAge: number;
  idDocumentType: string;            // Tabla L
  idNumber: string;
  emailPrimary: string | null;
  emailSecondary: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
}

// ─── Local Characterization (Ex-Antes) ───────────────────────────────────────

export interface LocalCharacterization {
  localId: string;                   // UUID generado offline — primary key
  familyId: string;
  entityId: string;
  municipalityId: string | null;
  professionalId: string;

  // Página 1 — Ubicación
  department: string;
  municipalityName: string;
  corregimiento: string | null;
  vereda: string | null;
  address: string;
  activityDate: string;              // ISO date YYYY-MM-DD

  // Página 2 — Cabeza de familia
  headFirstName: string;
  headSecondName: string | null;
  headFirstLastname: string;
  headSecondLastname: string | null;
  headFamilyRole: 'padre_cabeza' | 'madre_cabeza' | 'cuidador_cabeza';

  // Página 3 — Miembros
  members: FamilyMember[];

  // Página 4 — Consentimiento
  consentAccepted: boolean;
  beneficiarySignatureDataUrl: string | null;

  // Geo
  latitude: number | null;
  longitude: number | null;

  // Metadata
  status: 'draft' | 'completed' | 'synced';
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// ─── Offline activity queue item ──────────────────────────────────────────────

export interface LocalActivity {
  localId: string;                   // primary key
  type: 'activity';
  familyId: string;
  activityType: string;
  data: string;                      // JSON payload for Appwrite
  familyUpdate: string | null;       // JSON payload for family doc update
  status: 'pending' | 'synced' | 'failed';
  createdAt: number;
  retryCount: number;
}

// ─── Media queue item ─────────────────────────────────────────────────────────

export interface LocalMedia {
  id: string;
  activityLocalId: string;
  file: Blob;
  name: string;
  mimeType: string;
  bucketId: string;
  status: 'pending' | 'uploaded' | 'failed';
  appwriteFileId?: string;
}

// ─── Database class ───────────────────────────────────────────────────────────

export class ControlGDatabase extends Dexie {
  characterizations!: Table<LocalCharacterization, string>;
  activities!: Table<LocalActivity, string>;
  mediaQueue!: Table<LocalMedia, string>;

  constructor() {
    super('ControlG_v2');
    this.version(1).stores({
      characterizations: 'localId, familyId, entityId, professionalId, status',
      activities: 'localId, familyId, activityType, status, createdAt',
      mediaQueue: 'id, activityLocalId, status',
    });
  }
}

export const localDB = new ControlGDatabase();
