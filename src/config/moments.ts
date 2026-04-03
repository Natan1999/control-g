/**
 * Control G — Configuración de Momentos de Servicio
 * =================================================
 * Este archivo mapea los 5 momentos definidos en la
 * metodología de la Gobernación de Bolívar con sus
 * respectivos IDs de formularios en Appwrite.
 */

export interface MomentConfig {
  id: string;
  name: string;
  label: string;
  formId: string; // ID real en Appwrite COLLECTION_IDS.FORMS
  completionField: string; // Campo en COLLECTION_IDS.BENEFICIARY_FAMILIES
  responseField: string;   // Campo para guardar la última Response ID
}

export const SERVICE_MOMENTS: MomentConfig[] = [
  {
    id: 'EX_ANTES',
    name: 'Ex-Antes',
    label: '1. Caracterización Socioeconómica (Ex-Antes)',
    formId: 'form_ex_antes_bolivar',
    completionField: 'ex_antes_completed',
    responseField: 'ex_antes_response_id'
  },
  {
    id: 'ENCOUNTER_1',
    name: 'Taller 1',
    label: '2. Primer Taller de Acompañamiento',
    formId: 'form_enc_1_bolivar',
    completionField: 'encounter_1_completed',
    responseField: 'encounter_1_response_id'
  },
  {
    id: 'ENCOUNTER_2',
    name: 'Taller 2',
    label: '3. Segundo Taller de Acompañamiento',
    formId: 'form_enc_2_bolivar',
    completionField: 'encounter_2_completed',
    responseField: 'encounter_2_response_id'
  },
  {
    id: 'ENCOUNTER_3',
    name: 'Taller 3',
    label: '4. Tercer Taller de Acompañamiento',
    formId: 'form_enc_3_bolivar',
    completionField: 'encounter_3_completed',
    responseField: 'encounter_3_response_id'
  },
  {
    id: 'EX_POST',
    name: 'Ex-Post',
    label: '5. Evaluación de Impacto (Ex-Post)',
    formId: 'form_ex_post_bolivar',
    completionField: 'ex_post_completed',
    responseField: 'ex_post_response_id'
  }
];

export function getMomentByField(field: string): MomentConfig | undefined {
  return SERVICE_MOMENTS.find(m => m.completionField === field);
}

export function getNextMoment(currentMomentId: string): MomentConfig | null {
  const index = SERVICE_MOMENTS.findIndex(m => m.id === currentMomentId);
  if (index >= 0 && index < SERVICE_MOMENTS.length - 1) {
    return SERVICE_MOMENTS[index + 1];
  }
  return null;
}
