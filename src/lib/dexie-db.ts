import Dexie, { type Table } from 'dexie';

export interface LocalProject {
  $id: string;
  name: string;
  organization_id: string;
  status: string;
  settings: string;
  synced_at: number;
}

export interface LocalForm {
  $id: string;
  name: string;
  project_id: string | null;
  organization_id: string;
  schema: string;
  version: number;
  total_fields: number;
  synced_at: number;
}

export interface LocalZone {
  $id: string;
  name: string;
  type: string;
  municipality_id: string;
  parent_zone_id: string | null;
  synced_at: number;
}

export interface LocalResponse {
  local_id: string;
  form_id: string;
  project_id: string;
  organization_id: string;
  technician_id: string;
  zone_id: string | null;
  data: string; // JSON
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: string;
  source: string;
  device_info: string;
  started_at: string | null;
  completed_at: string | null;
  
  // Sync metadata
  sync_status: 'pending' | 'synced' | 'failed';
  retry_count: number;
  created_at: number;
}

export interface LocalBeneficiaryFamily {
  local_id: string;
  project_id: string;
  organization_id: string;
  technician_id: string;
  head_first_name: string;
  head_first_lastname: string;
  head_id_number: string | null;
  head_phone: string | null;
  vereda: string | null;
  address: string | null;
  moment: string;
  sync_status: 'pending' | 'synced' | 'failed';
  retry_count: number;
  created_at: number;
}

export interface LocalFamilyMember {
  local_id: string;
  family_local_id: string;
  full_name: string;
  family_bond: string | null;
  age: number | null;
  sync_status: 'pending' | 'synced' | 'failed';
  retry_count: number;
}

export interface LocalMediaItem {
  id: string;
  response_local_id: string;
  file: Blob;
  name: string;
  type: string;
  bucket_id: string; // which bucket to route to
  status: 'pending' | 'uploaded' | 'failed';
  appwrite_file_id?: string;
}

export class ControlGDatabase extends Dexie {
  projects!: Table<LocalProject, string>;
  forms!: Table<LocalForm, string>;
  zones!: Table<LocalZone, string>;
  responses!: Table<LocalResponse, string>;
  families!: Table<LocalBeneficiaryFamily, string>;
  familyMembers!: Table<LocalFamilyMember, string>;
  mediaQueue!: Table<LocalMediaItem, string>;

  constructor() {
    super('ControlG_LocalDB');
    this.version(1).stores({
      projects: '$id, organization_id, status',
      forms: '$id, project_id, organization_id',
      zones: '$id, municipality_id, parent_zone_id',
      responses: 'local_id, form_id, sync_status, created_at',
      families: 'local_id, project_id, head_id_number, sync_status',
      familyMembers: 'local_id, family_local_id, sync_status',
      mediaQueue: 'id, response_local_id, status'
    });
  }
}

export const localDB = new ControlGDatabase();
