// Subject types and interfaces for the Subjects Tab

export type SubjectCategory = 'person' | 'vehicle' | 'location' | 'item';
export type SubjectStatus = 'active' | 'archived';

export type SocialPlatform = 
  | 'facebook' 
  | 'instagram' 
  | 'x' 
  | 'linkedin' 
  | 'tiktok' 
  | 'snapchat' 
  | 'youtube' 
  | 'reddit' 
  | 'whatsapp' 
  | 'telegram' 
  | 'other';

export interface SubjectSocialLink {
  id: string;
  subject_id: string;
  organization_id: string;
  platform: SocialPlatform;
  label: string | null;
  url: string;
  created_at: string;
  created_by: string | null;
}

export interface SubjectLink {
  id: string;
  case_id: string;
  organization_id: string;
  source_subject_id: string;
  target_subject_id: string;
  link_type: string;
  created_at: string;
  created_by: string | null;
}

export interface Subject {
  id: string;
  case_id: string;
  organization_id: string;
  subject_type: SubjectCategory;
  name: string;
  display_name: string | null;
  details: Record<string, any>;
  notes: string | null;
  status: SubjectStatus;
  role: string | null;
  profile_image_url: string | null;
  is_primary: boolean | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  // Linked subjects (populated from subject_links)
  linked_people?: Subject[];
  linked_vehicles?: Subject[];
  linked_locations?: Subject[];
  linked_items?: Subject[];
}

export const PERSON_ROLES = [
  { value: 'claimant', label: 'Claimant' },
  { value: 'subject', label: 'Subject' },
  { value: 'witness', label: 'Witness' },
  { value: 'associate', label: 'Associate' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'truck', label: 'Truck' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
] as const;

export const LOCATION_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'medical', label: 'Medical' },
  { value: 'public', label: 'Public' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const ITEM_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'device', label: 'Device' },
  { value: 'bag', label: 'Bag' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'document', label: 'Document' },
  { value: 'tool', label: 'Tool' },
  { value: 'other', label: 'Other' },
] as const;

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;

export const SUBJECT_CATEGORY_LABELS: Record<SubjectCategory, string> = {
  person: 'People',
  vehicle: 'Vehicles',
  location: 'Locations',
  item: 'Items',
};

export const SUBJECT_CATEGORY_SINGULAR: Record<SubjectCategory, string> = {
  person: 'Person',
  vehicle: 'Vehicle',
  location: 'Location',
  item: 'Item',
};
