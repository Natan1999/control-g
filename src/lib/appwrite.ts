/**
 * Control G — Cliente Appwrite (Frontend)
 */

import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export const functions = new Functions(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'control_g';

export const COLLECTION_IDS = {
  ENTITIES:                 'entities',
  ENTITY_MUNICIPALITIES:    'entity_municipalities',
  USER_PROFILES:            'user_profiles',
  PROFESSIONAL_ASSIGNMENTS: 'professional_assignments',
  FAMILIES:                 'families',
  ACTIVITIES:               'activities',
  OBSERVATIONS:             'observations',
  AUDIT_LOG:                'audit_log',
  SYNC_LOG:                 'sync_log',
} as const;

export const BUCKET_IDS = {
  FIELD_PHOTOS: 'field-photos',
  SIGNATURES:   'signatures',
  AVATARS:      'avatars',
  EXPORTS:      'exports',
} as const;

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS];
export type BucketId     = typeof BUCKET_IDS[keyof typeof BUCKET_IDS];

export default client;
