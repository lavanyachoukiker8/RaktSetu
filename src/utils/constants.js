export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const CITIES = ['Surat', 'Ahmedabad', 'Vadodara', 'Mumbai', 'Pune'];
export const URGENCIES = ['NORMAL', 'URGENT', 'CRITICAL'];
export const REQUEST_STATUSES = ['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED'];
export const MIN_GAP_DAYS = 90;
export const DEFAULT_THRESHOLD = 8;

// Who each blood group can donate to
export const CAN_DONATE_TO = {
  'O-': [...BLOOD_GROUPS],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

// Donor groups that are compatible with a recipient group
export const donorGroupsFor = (recipient) => BLOOD_GROUPS.filter((g) => CAN_DONATE_TO[g].includes(recipient));

export const BADGES = [
  { key: 'bronze', name: 'Bronze', min: 3, desc: '3 donations' },
  { key: 'silver', name: 'Silver', min: 5, desc: '5 donations' },
  { key: 'gold', name: 'Gold', min: 10, desc: '10 donations' },
];

// Graded red shades for charts (red-300 .. red-900)
export const RED_SHADES = ['#FF97A1', '#F26471', '#E63946', '#D62839', '#B71C2C', '#8E1422', '#6B0F1A'];

export const PREFERRED_TIMES = ['Morning (8-12)', 'Afternoon (12-4)', 'Evening (4-9)', 'Anytime'];
