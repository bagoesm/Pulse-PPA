// src/utils/foreignKeyValidation.ts
// Utility for validating foreign key references before database operations
// Validates: Requirements 10.2, 10.3, 15.1, 15.2

import { supabase as defaultSupabase } from '../lib/supabaseClient';

export class ForeignKeyValidationError extends Error {
  constructor(
    public entityType: string,
    public entityId: string,
    message?: string
  ) {
    super(message || `Referenced ${entityType} with ID ${entityId} does not exist`);
    this.name = 'ForeignKeyValidationError';
  }
}

/**
 * Validate that a Surat exists in the database
 * Validates: Requirements 15.1
 */
export async function validateSuratExists(
  suratId: string,
  supabaseClient?: any
): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  try {
    const { data, error } = await supabase
      .from('surats')
      .select('id')
      .eq('id', suratId)
      .single();

    if (error) {
      // If error is "not found", return false
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error validating Surat existence:', error);
    throw error;
  }
}

/**
 * Validate that a Kegiatan/Meeting exists in the database
 * Validates: Requirements 15.2
 */
export async function validateKegiatanExists(
  kegiatanId: string,
  supabaseClient?: any
): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', kegiatanId)
      .single();

    if (error) {
      // If error is "not found", return false
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error validating Kegiatan existence:', error);
    throw error;
  }
}

/**
 * Validate that a User exists in the database
 * Validates: Requirements 10.3
 */
export async function validateUserExists(
  userId: string,
  supabaseClient?: any
): Promise<boolean> {
  const supabase = supabaseClient || defaultSupabase;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) {
      // If error is "not found", return false
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error validating User existence:', error);
    throw error;
  }
}

/**
 * Validate that multiple users exist in the database
 * Validates: Requirements 10.3
 */
export async function validateUsersExist(
  userIds: string[],
  supabaseClient?: any
): Promise<{ valid: boolean; invalidUsers: string[] }> {
  const supabase = supabaseClient || defaultSupabase;

  if (!userIds || userIds.length === 0) {
    return { valid: true, invalidUsers: [] };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);

    if (error) throw error;

    const existingUserIds = data ? data.map((u: any) => u.id) : [];
    const invalidUsers = userIds.filter(id => !existingUserIds.includes(id));

    return {
      valid: invalidUsers.length === 0,
      invalidUsers,
    };
  } catch (error) {
    console.error('Error validating Users existence:', error);
    throw error;
  }
}

/**
 * Validate Surat-Kegiatan link references
 * Validates both Surat and Kegiatan exist before linking
 * Validates: Requirements 15.1, 15.2, 15.3
 */
export async function validateLinkReferences(
  suratId: string,
  kegiatanId: string,
  supabaseClient?: any
): Promise<void> {
  const supabase = supabaseClient || defaultSupabase;

  // Validate Surat exists
  const suratExists = await validateSuratExists(suratId, supabase);
  if (!suratExists) {
    throw new ForeignKeyValidationError('Surat', suratId);
  }

  // Validate Kegiatan exists
  const kegiatanExists = await validateKegiatanExists(kegiatanId, supabase);
  if (!kegiatanExists) {
    throw new ForeignKeyValidationError('Kegiatan', kegiatanId);
  }
}

/**
 * Validate Disposisi creation references
 * Validates Surat, Kegiatan, and all assignees exist
 * Validates: Requirements 10.2, 10.3, 15.1, 15.2
 */
export async function validateDisposisiReferences(
  suratId: string,
  kegiatanId: string,
  assignees: string[],
  supabaseClient?: any
): Promise<void> {
  const supabase = supabaseClient || defaultSupabase;

  // Validate Surat and Kegiatan
  await validateLinkReferences(suratId, kegiatanId, supabase);

  // Validate all assignees exist
  const { valid, invalidUsers } = await validateUsersExist(assignees, supabase);
  if (!valid) {
    throw new ForeignKeyValidationError(
      'User',
      invalidUsers.join(', '),
      `Referenced User(s) with ID(s) ${invalidUsers.join(', ')} do not exist`
    );
  }
}

/**
 * Validate a single reference exists
 * Generic validation function for any entity type
 */
export async function validateReferenceExists(
  tableName: string,
  entityId: string,
  entityType: string,
  supabaseClient?: any
): Promise<void> {
  const supabase = supabaseClient || defaultSupabase;

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', entityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ForeignKeyValidationError(entityType, entityId);
      }
      throw error;
    }

    if (!data) {
      throw new ForeignKeyValidationError(entityType, entityId);
    }
  } catch (error) {
    if (error instanceof ForeignKeyValidationError) {
      throw error;
    }
    console.error(`Error validating ${entityType} existence:`, error);
    throw error;
  }
}
