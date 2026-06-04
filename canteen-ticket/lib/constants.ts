export const DEPARTMENTS = [
  'HR',
  'Sales & Marketing',
  'Finance',
  'Procurement',
  'Admin',
  'Design Laboratory',
  'Store General',
  'Store & Warehouse',
  'Polishing',
  'Tile Fact. General',
  'Pressing & Drying',
  'Quality Control',
  'Sorting & Packing',
  'QC Laboratory',
  'Slip',
  'Mechanical Maintenance',
  'Glaze Line',
  'Glaze Preparation',
  'Kiln',
  'Facility Management',
  'Maintenance General',
  'Electrical Maintenance',
  'HSE',
  'GAS Station',
  'IT',
  'Squaring',
  'Factory General',
  'Police',
] as const;

export const POSITIONS = [
  'Manager',
  'Staff',
  'Workmen',
  'Visitor',
  'Police',
  'Intern',
] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type Position = (typeof POSITIONS)[number];