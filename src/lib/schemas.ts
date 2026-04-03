import { FormSchema } from '@/types/forms';

export const EX_ANTES_SCHEMA: FormSchema = {
  formId: "tpl-ex-antes-seguridad-bolivar",
  version: 1,
  settings: {
    allow_draft_save: true,
    require_gps: true,
    auto_capture_gps: true,
    require_signature: true,
    enable_ocr: true,
    linked_entity: "beneficiary_family"
  },
  pages: [
    {
      id: "page_location",
      title: "Ubicación Geográfica",
      description: "Datos del lugar donde se realiza la caracterización",
      fields: [
        { id: "department", type: "single_select", label: "Departamento", required: true, source: "catalog:departments" },
        { id: "municipality", type: "single_select", label: "Municipio", required: true, source: "catalog:municipalities", conditional: { field_id: "department", operator: "is_not_empty" } },
        { id: "corregimiento", type: "text_short", label: "Corregimiento", required: false },
        { id: "vereda", type: "text_short", label: "Vereda", required: false },
        { id: "address", type: "text_short", label: "Dirección", required: true, help_text: "Dirección o descripción de cómo llegar" },
        { id: "date", type: "date", label: "Fecha del proceso", required: true, default: "today" }
      ]
    },
    {
      id: "page_head",
      title: "Cabeza de Familia",
      description: "Datos de la persona responsable del hogar",
      fields: [
        { id: "head_first_name", type: "text_short", label: "Primer nombre", required: true, help_text: "Como aparece en el documento de identidad" },
        { id: "head_second_name", type: "text_short", label: "Segundo nombre", required: false },
        { id: "head_first_lastname", type: "text_short", label: "Primer apellido", required: true },
        { id: "head_second_lastname", type: "text_short", label: "Segundo apellido", required: false }
      ]
    },
    {
      id: "page_members",
      title: "Miembros del Hogar",
      description: "Registre cada persona que vive en el hogar",
      fields: [
        {
          id: "members",
          type: "repeating_group",
          label: "Personas del hogar",
          min_entries: 1,
          max_entries: 20,
          add_button_text: "+ Agregar otra persona",
          fields: [
            { id: "member_name", type: "text_short", label: "Nombre completo", required: true },
            { id: "member_bond", type: "single_select", label: "Vínculo con la cabeza de familia", source: "catalog:family_bonds", required: true },
            { id: "member_sex", type: "single_select", label: "Sexo", source: "catalog:sex", required: true },
            { id: "member_gender", type: "single_select", label: "Identidad de género", source: "catalog:gender_identity", required: true },
            { id: "member_orientation", type: "single_select", label: "Orientación sexual", source: "catalog:sexual_orientation", required: true },
            { id: "member_education", type: "single_select", label: "Nivel escolar", source: "catalog:education_level", required: true },
            { id: "member_ethnic", type: "single_select", label: "¿A qué grupo étnico pertenece?", source: "catalog:ethnic_groups", required: true },
            { id: "member_disability", type: "single_select", label: "¿Tiene alguna discapacidad?", source: "catalog:disabilities", required: true },
            { id: "member_condition", type: "single_select", label: "Condición especial", source: "catalog:special_conditions", required: true },
            { id: "member_peace", type: "single_select", label: "Enfoque de paz", source: "catalog:peace_approach", required: true },
            { id: "member_civil_status", type: "single_select", label: "Estado civil", source: "catalog:marital_status", required: true },
            { id: "member_birth_date", type: "date", label: "Fecha de nacimiento", required: true },
            { id: "member_doc_type", type: "single_select", label: "Tipo de documento", source: "catalog:id_document_types", required: true },
            { id: "member_doc_number", type: "text_short", label: "Número de documento", required: true, validations: { pattern: "^[0-9]{4,15}$", custom_message: "Solo números" } }
          ]
        }
      ]
    },
    {
      id: "page_evidence",
      title: "Evidencia Fotográfica",
      fields: [
        { id: "photo_facade", type: "photo", label: "Foto de la fachada", required: false, max_files: 2 },
        { id: "photo_conditions", type: "photo", label: "Foto de condiciones del hogar", required: false, max_files: 3 }
      ]
    },
    {
      id: "page_consent",
      title: "Consentimiento y Firma",
      fields: [
        { id: "consent_text", type: "section_title", label: "CONSENTIMIENTO INFORMADO", help_text: "En cumplimiento de la Ley 1581 de 2012... autorizo el tratamiento de mis datos personales." },
        { id: "consent_checkbox", type: "yes_no", label: "He leído y acepto el tratamiento de datos personales", required: true },
        { id: "signature", type: "signature", label: "Firma del cabeza de familia", required: true, help_text: "Pida a la persona que firme con su dedo en la pantalla" }
      ]
    }
  ]
};

export const ENCOUNTER_1_SCHEMA: FormSchema = {
  formId: "tpl-enc-1-cocreacion",
  version: 1,
  settings: { allow_draft_save: true, require_signature: true, linked_entity: "beneficiary_family" },
  pages: [
    {
      id: "page_needs",
      title: "Taller de Cocreación",
      description: "Identificación de necesidades y prioridades del hogar",
      fields: [
        { id: "priority_needs", type: "multi_select", label: "Necesidades Prioritarias", options: [
          { value: "alimentacion", label: "Alimentación" },
          { value: "vivienda", label: "Mejoramiento de Vivienda" },
          { value: "salud", label: "Acceso a Salud" },
          { value: "educacion", label: "Educación" },
          { value: "ingresos", label: "Generación de Ingresos" }
        ], required: true },
        { id: "community_role", type: "text_long", label: "¿Cómo se ve su familia aportando a la comunidad?", required: true },
        { id: "commitment", type: "yes_no", label: "¿Se compromete a participar en las actividades del proyecto?", required: true },
        { id: "signature_enc1", type: "signature", label: "Firma de Compromiso", required: true }
      ]
    }
  ]
};

export const ENCOUNTER_2_SCHEMA: FormSchema = {
  formId: "tpl-enc-2-seguimiento",
  version: 1,
  settings: { allow_draft_save: true, linked_entity: "beneficiary_family" },
  pages: [
    {
      id: "page_tracking",
      title: "Seguimiento Técnico",
      description: "Avances en los compromisos adquiridos",
      fields: [
        { id: "progress_percent", type: "number", label: "Porcentaje de avance estimado", required: true, validations: { min: 0, max: 100 } },
        { id: "observations", type: "text_long", label: "Observaciones del técnico", required: true },
        { id: "barriers", type: "text_long", label: "Dificultades encontradas", required: false },
        { id: "photo_progress", type: "photo", label: "Registro fotográfico de avance", required: true, max_files: 3 }
      ]
    }
  ]
};

export const ENCOUNTER_3_SCHEMA: FormSchema = {
  formId: "tpl-enc-3-verificacion",
  version: 1,
  settings: { allow_draft_save: true, require_signature: true, linked_entity: "beneficiary_family" },
  pages: [
    {
      id: "page_achievements",
      title: "Verificación de Logros",
      description: "Validación final de los resultados esperados",
      fields: [
        { id: "achievements_list", type: "multi_select", label: "Logros alcanzados", options: [
          { value: "seguridad_alimentaria", label: "Seguridad Alimentaria Mejorada" },
          { value: "habitabilidad", label: "Mejora en Habitabilidad" },
          { value: "organizacion", label: "Mejora en Organización Familiar" }
        ], required: true },
        { id: "family_perception", type: "text_long", label: "Percepción de la familia sobre el cambio", required: true },
        { id: "signature_achiev", type: "signature", label: "Firma de verificación", required: true }
      ]
    }
  ]
};

export const EX_POST_SCHEMA: FormSchema = {
  formId: "tpl-ex-post-evaluacion",
  version: 1,
  settings: { allow_draft_save: true, linked_entity: "beneficiary_family" },
  pages: [
    {
      id: "page_eval",
      title: "Cierre y Evaluación",
      description: "Evaluación final del impacto del programa",
      fields: [
        { id: "satisfaction", type: "single_select", label: "Nivel de satisfacción general", options: [
          { value: "muy_satisfecho", label: "Muy Satisfecho" },
          { value: "satisfecho", label: "Satisfecho" },
          { value: "neutral", label: "Neutral" },
          { value: "insatisfecho", label: "Insatisfecho" }
        ], required: true },
        { id: "impact_rating", type: "number", label: "Calificación de impacto (1-5)", required: true, validations: { min: 1, max: 5 } },
        { id: "final_comments", type: "text_long", label: "Comentarios finales / Recomendaciones", required: false },
        { id: "photo_closure", type: "photo", label: "Foto de cierre (Familia + Técnico)", required: true }
      ]
    }
  ]
};
