/**
 * Control G — Funciones de Autenticación (Appwrite)
 * ===================================================
 * Todas las operaciones de auth: login, logout, registro,
 * recuperación de contraseña y gestión de sesiones.
 */

import { ID, Query, AppwriteException } from 'appwrite';
import { account, databases, DATABASE_ID, COLLECTION_IDS } from './appwrite';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'coordinator' | 'assistant' | 'technician';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  $id:             string;
  $createdAt:      string;
  $updatedAt:      string;
  user_id:         string;
  organization_id: string | null;
  full_name:       string;
  phone:           string | null;
  role:            UserRole;
  avatar_url:      string | null;
  status:          UserStatus;
  last_seen_at:    string | null;
  last_sync_at:    string | null;
  last_known_latitude:  number | null;
  last_known_longitude: number | null;
  device_info:     string;
}

export interface AuthUser {
  $id:      string;
  email:    string;
  name:     string;
  emailVerification: boolean;
  profile?: UserProfile;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mapea un error de Appwrite a un mensaje amigable en español.
 */
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

// ─── Funciones de Auth ────────────────────────────────────────────────────────

/**
 * Inicia sesión con email y contraseña.
 * Retorna el usuario de Appwrite Auth + su perfil de la colección user_profiles.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  try {
    await account.createEmailPasswordSession(email, password);
    return await getCurrentUser();
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Cierra la sesión actual del usuario.
 */
export async function logout(): Promise<void> {
  try {
    await account.deleteSession('current');
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Cierra TODAS las sesiones activas del usuario.
 */
export async function logoutAll(): Promise<void> {
  try {
    await account.deleteSessions();
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Obtiene el usuario autenticado actual junto con su perfil.
 * Lanza error si no hay sesión activa.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  try {
    const user = await account.get();

    // Intentar obtener el perfil — si no existe, continuamos sin él
    let profile: UserProfile | undefined;
    try {
      profile = await getUserProfile(user.$id);
    } catch {
      // El perfil puede no existir aún (usuario recién creado)
    }

    return {
      $id:               user.$id,
      email:             user.email,
      name:              user.name,
      emailVerification: user.emailVerification,
      profile,
    };
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Verifica si hay una sesión activa sin lanzar error.
 * Retorna el usuario o null.
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Obtiene el perfil de la colección user_profiles por el ID de usuario de Auth.
 */
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

/**
 * Registra un nuevo usuario en Appwrite Auth y crea su perfil.
 */
export async function register(
  email:          string,
  password:       string,
  name:           string,
  role:           UserRole     = 'technician',
  organizationId: string | null = null
): Promise<AuthUser> {
  try {
    // 1. Crear cuenta en Appwrite Auth
    const user = await account.create(ID.unique(), email, password, name);

    // 2. Crear sesión automáticamente
    await account.createEmailPasswordSession(email, password);

    // 3. Crear perfil en la colección
    const profile = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.USER_PROFILES,
      ID.unique(),
      {
        user_id:         user.$id,
        organization_id: organizationId,
        full_name:       name,
        role,
        status:          'active',
        device_info:     JSON.stringify({}),
      }
    );

    return {
      $id:               user.$id,
      email:             user.email,
      name:              user.name,
      emailVerification: user.emailVerification,
      profile:           profile as unknown as UserProfile,
    };
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Actualiza el perfil del usuario autenticado.
 */
export async function updateProfile(
  profileId: string,
  data: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'avatar_url' | 'device_info' | 'last_seen_at' | 'last_sync_at' | 'last_known_latitude' | 'last_known_longitude'>>
): Promise<UserProfile> {
  try {
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.USER_PROFILES,
      profileId,
      data
    );
    return updated as unknown as UserProfile;
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Actualiza la ubicación del usuario (para tracking de técnicos en campo).
 */
export async function updateUserLocation(
  profileId: string,
  latitude:  number,
  longitude: number
): Promise<void> {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.USER_PROFILES,
      profileId,
      {
        last_known_latitude:  latitude,
        last_known_longitude: longitude,
        last_seen_at:         new Date().toISOString(),
      }
    );
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Envía email de recuperación de contraseña.
 */
export async function sendPasswordRecovery(
  email:      string,
  redirectUrl: string
): Promise<void> {
  try {
    await account.createRecovery(email, redirectUrl);
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Completa la recuperación de contraseña con el token recibido por email.
 */
export async function confirmPasswordRecovery(
  userId:   string,
  secret:   string,
  password: string
): Promise<void> {
  try {
    await account.updateRecovery(userId, secret, password);
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Actualiza la contraseña del usuario autenticado.
 */
export async function updatePassword(
  currentPassword: string,
  newPassword:     string
): Promise<void> {
  try {
    await account.updatePassword(newPassword, currentPassword);
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Envía email de verificación de cuenta.
 */
export async function sendEmailVerification(redirectUrl: string): Promise<void> {
  try {
    await account.createVerification(redirectUrl);
  } catch (err) {
    throw mapError(err);
  }
}

/**
 * Confirma la verificación de email con el token recibido.
 */
export async function confirmEmailVerification(
  userId: string,
  secret: string
): Promise<void> {
  try {
    await account.updateVerification(userId, secret);
  } catch (err) {
    throw mapError(err);
  }
}
