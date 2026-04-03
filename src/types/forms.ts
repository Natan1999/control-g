export type FieldType = 
  | 'text_short' 
  | 'text_long' 
  | 'date' 
  | 'single_select' 
  | 'multi_select' 
  | 'number' 
  | 'photo' 
  | 'signature' 
  | 'geolocation' 
  | 'yes_no' 
  | 'section_title'
  | 'repeating_group';

export interface FieldOption { value: string; label: string; }

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  help_text?: string;
  placeholder?: string;
  source?: string; // e.g. "catalog:departments"
  options?: FieldOption[];
  display_as?: 'radio' | 'dropdown' | 'checkbox';
  default?: string | number | boolean;
  auto_capture?: boolean;
  max_files?: number;
  validations?: {
    pattern?: string;
    custom_message?: string;
    min?: number;
    max?: number;
  };
  conditional?: {
    field_id: string;
    operator: 'is_empty' | 'is_not_empty' | 'equals' | 'not_equals';
    value?: any;
  };
  fields?: FormField[]; // Used for repeating_group
  min_entries?: number;
  max_entries?: number;
  add_button_text?: string;
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormSchema {
  formId: string;
  version: number;
  settings: {
    allow_draft_save?: boolean;
    require_gps?: boolean;
    auto_capture_gps?: boolean;
    require_signature?: boolean;
    enable_ocr?: boolean;
    linked_entity?: string;
  };
  pages: FormPage[];
}
