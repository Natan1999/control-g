/**
 * Control G — Funciones de Autenticación (Appwrite)
 */

import { ID, Query, AppwriteException } from 'appwrite';
import { account, databases, DATABASE_ID, COLLECTION_IDS } from './appwrite';
import type { UserRole } from '@/types';

export type { UserRole };
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  $id:          string;
  $createdAt:   string;
  $updatedAt:   string;
  user_id:      string;
  entity_id:    string | null;
  full_name:    string;
  phone:        string | null;
  role:         UserRole;
  avatar_url:   string | null;
  signature_url: string | null;
  status:       UserStatus;
  last_seen_at: string | null;
  last_sync_at: string | null;
}

export interface AuthUser {
  $id:      string;
  email:    string;
  name:     string;
  emailVerification: boolean;
  profile?: UserProfile;
}

function mapError(err: unknown): Error {
  if (err instanceof AppwriteException) {
    switch (err.code) {
      case 401: return new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
      case 404: return new Error('Usuario no encontrado.');
      case 409: return new Error('Ya existe una cuenta con este email.');
      case 429: return new Error('Demasiados intentos. Espera un momento e intenta de nuevo.');
      default:  return new Error(err.message || 'Error desconocido de autenticación.');
    }
  }
  if (err instanceof Error) return err;
  return new Error('Error inesperado.');
}

export async function login(email: string, password: string): Promise<AuthUser> {
  try {
    try {
      await account.createEmailPasswordSession(email, password);
    } catch (sessionErr: unknown) {
      if (sessionErr instanceof AppwriteException &&
         (sessionErr.type === 'user_session_already_exists' || sessionErr.message.includes('session is active'))) {
        await account.deleteSession('current').catch(() => {});
        await account.createEmailPasswordSession(email, password);
      } else {
        throw sessionErr;
      }
    }
    return await getCurrentUser();
  } catch (err) {
    throw mapError(err);
  }
}

export async function logout(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch (err) {
    throw mapError(err);
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  try {
    const user = await account.get();
    let profile: UserProfile | undefined;
    try {
      profile = await getUserProfile(user.$id);
    } catch {
      // Profile may not exist yet
    }
    return { $id: user.$id, email: user.email, name: user.name, emailVerification: user.emailVerification, profile };
  } catch (err) {
    throw mapError(err);
  }
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.USER_PROFILES,
      [Query.equal('user_id', userId), Query.limit(1)]
    );
    if (result.documents.length === 0) {
      throw new Error(`No se encontró perfil para el usuario ${userId}`);
    }
    return result.documents[0] as unknown as UserProfile;
  } catch (err) {
    throw mapError(err);
  }
}

export async function register(
  email:    string,
  password: string,
  name:     string,
  role:     UserRole    = 'professional',
  entityId: string | null = null
): Promise<AuthUser> {
  try {
    const user = await account.create(ID.unique(), email, password, name);
    await account.createEmailPasswordSession(email, password);
    const profile = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.USER_PROFILES,
      ID.unique(),
      { user_id: user.$id, entity_id: entityId, full_name: name, role, status: 'active', signature_url: null }
    );
    return { $id: user.$id, email: user.email, name: user.name, emailVerification: user.emailVerification, profile: profile as unknown as UserProfile };
  } catch (err) {
    throw mapError(err);
  }
}

export async function updateProfile(
  profileId: string,
  data: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'avatar_url' | 'signature_url' | 'last_seen_at' | 'last_sync_at'>>
): Promise<UserProfile> {
  try {
    const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_IDS.USER_PROFILES, profileId, data);
    return updated as unknown as UserProfile;
  } catch (err) {
    throw mapError(err);
  }
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await account.updatePassword(newPassword, currentPassword);
  } catch (err) {
    throw mapError(err);
  }
}

export async function sendPasswordRecovery(email: string, redirectUrl: string): Promise<void> {
  try {
    await account.createRecovery(email, redirectUrl);
  } catch (err) {
    throw mapError(err);
  }
}
