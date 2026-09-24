/**
 * MJ-MC / MA JUAH MEMORIAL CLINIC — LABORATORY REQUEST FORM catalog.
 *
 * This file is the single source of truth for the laboratory request/result
 * form. The order below is EXACTLY the order on the paper form:
 *  - Sections are not reordered, renamed, merged, or alphabetised.
 *  - Tests keep the exact wording and category they appear under on the form.
 *  - `displayOrder` is a single global sequence so the UI and print/PDF
 *    always reproduce the same order (database sorting must never change it).
 *
 * Fields with blanks on the paper form are modelled as result fields; values
 * shown in parentheses on the form are stored as the reference text.
 */

export interface CatalogSeed {
  code: string;
  name: string;
  category: string;
  unit?: string;
  refMin?: number | null;
  refMax?: number | null;
  refText?: string;
  resultType: 'NUMERIC' | 'TEXT' | 'POSITIVE_NEGATIVE' | 'SELECT' | 'BLOOD_GROUP';
  options?: string;
  displayOrder: number;
}

let seq = 0;
const t = (
  name: string,
  category: string,
  resultType: CatalogSeed['resultType'] = 'TEXT',
  unit?: string,
  refText?: string,
  refMin?: number | null,
  refMax?: number | null,
): CatalogSeed => ({
  code: `MJ-${String(++seq).padStart(3, '0')}`,
  name,
  category,
  resultType,
  unit,
  refText,
  refMin: refMin ?? null,
  refMax: refMax ?? null,
  displayOrder: seq,
});

// Section header names — exact wording from the paper form.
const HAEMATOLOGY = 'HAEMATOLOGY/ IMMUNO-HAEMATOLOGY';
const IMMUNOLOGY = 'IMMUNOLOGY & SEROLOGY';
const BIO = 'BIOCHEMISTRY';
const BIO_GLUCOSE = `${BIO} — GLUCOSE METABOLISM/DIABETES`;
const BIO_LIPID = `${BIO} — LIPID METABOLISM PANEL`;
const BIO_HEART = `${BIO} — HEART DISEASE PANEL`;
const BIO_LIVER = `${BIO} — LIVER FUNCTION TESTS`;
const BIO_KIDNEY = `${BIO} — KIDNEY FUNCTION TEST`;
const BIO_ELECTRO = `${BIO} — ELECTROLYTES PANEL`;
const BIO_PANCREAS = `${BIO} — PANCREATIC FUNCTION PANEL`;
const BIO_THYROID = `${BIO} — THYROID FUNCTION TESTS`;
const BIO_TUMOR = `${BIO} — TUMAR MARKERS`;
const NUTRITIONAL = 'NUTRITIONAL PANEL';
const COAG = 'COAGULATION ACTIVITIES';
const INF_FEMALE = 'INFERTILITY FEMALE';
const INF_MALE = 'INFERTILITY MALE';
const EARLY_PREG = 'EARLY PREGNANCY CHECK UP';
const COLORECTAL = 'COLORECTAL OCCUTE BLOOD TEST';
const URINE_MACRO = 'URINALYSIS — MACROSCOPIC EXAMINATION';
const URINE_CHEM = 'URINALYSIS — CHEMISTRY EXAMINATION';
const URINE_MICRO = 'URINALYSIS — MICROSCOPIC EXAMINATION';
const STOOL_MACRO = 'PARASITOLOGY STOOL (WET MOUNT) — MACROSCOPIC EXAMINATION';
const STOOL_MICRO = 'PARASITOLOGY STOOL (WET MOUNT) — MICROSCOPIC EXAMINATION';

export const LAB_CATALOG_SEED: CatalogSeed[] = [
  // ============================================================
  // HAEMATOLOGY/ IMMUNO-HAEMATOLOGY
  // ============================================================
  t('HB Hemoglobin', HAEMATOLOGY, 'NUMERIC', 'g/dl'),
  t('CBC Complete blood count', HAEMATOLOGY, 'TEXT'),
  t('WBC white Blood Cells', HAEMATOLOGY, 'NUMERIC', 'x10^9/l'),
  t('Malaria Smear', HAEMATOLOGY, 'TEXT'),
  t('Sickle Cells Identification (rapid)', HAEMATOLOGY, 'TEXT'),
  t('ABO& Rh) Blood Group', HAEMATOLOGY, 'BLOOD_GROUP'),
  t('ESR', HAEMATOLOGY, 'NUMERIC', 'mm/hr'),
  t('Malaria RDT', HAEMATOLOGY, 'POSITIVE_NEGATIVE', undefined, 'Negative'),

  // ============================================================
  // IMMUNOLOGY & SEROLOGY
  // ============================================================
  t('Widal panel', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi O Ag', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi H Ag', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi AO Ag', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi BO Ag', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi CH Ag', IMMUNOLOGY, 'TEXT'),
  t('Salmonella typhi AH Ag', IMMUNOLOGY, 'TEXT'),
  t('Syphilis', IMMUNOLOGY, 'POSITIVE_NEGATIVE'),
  t('Chlamydia (Ag) Swab', IMMUNOLOGY, 'TEXT'),
  t('Filariasis (IgG+IgM)', IMMUNOLOGY, 'TEXT'),
  t('Helicobacter pylori (IgG+IgM)', IMMUNOLOGY, 'TEXT'),
  t('Hepatitis B Virus (screening)', IMMUNOLOGY, 'TEXT'),
  t('HBsAg', IMMUNOLOGY, 'TEXT'),
  t('HBsAb', IMMUNOLOGY, 'TEXT'),
  t('HBcAb', IMMUNOLOGY, 'TEXT'),
  t('HBeAb', IMMUNOLOGY, 'TEXT'),
  t('HBeAg', IMMUNOLOGY, 'TEXT'),
  t('Hepatitis C Virus (IgM+IgG)', IMMUNOLOGY, 'TEXT'),
  t('Human Immunodeficiency Virus (HIV1+2)', IMMUNOLOGY, 'TEXT'),
  t('Determine', IMMUNOLOGY, 'TEXT'),
  t('SD Bioline', IMMUNOLOGY, 'TEXT'),
  t('Uni-Gold', IMMUNOLOGY, 'TEXT'),

  // ============================================================
  // BIOCHEMISTRY — GLUCOSE METABOLISM/DIABETES
  // ============================================================
  t('Fasting Blood Glucose', BIO_GLUCOSE, 'NUMERIC', 'mg/dl'),
  t('Random Blood Glucose', BIO_GLUCOSE, 'NUMERIC', 'mg/dl'),
  t('HbA1c', BIO_GLUCOSE, 'TEXT'),
  t('OGTT', BIO_GLUCOSE, 'TEXT'),
  t('LH', BIO_GLUCOSE, 'TEXT'),

  // BIOCHEMISTRY — LIPID METABOLISM PANEL
  t('Cholesterol', BIO_LIPID, 'NUMERIC'),
  t('Triglycerides', BIO_LIPID, 'NUMERIC'),
  t('HDL Cholesterol', BIO_LIPID, 'NUMERIC'),
  t('LDL Cholesterol', BIO_LIPID, 'NUMERIC'),

  // BIOCHEMISTRY — HEART DISEASE PANEL
  t('CK & CK-MB', BIO_HEART, 'TEXT'),
  t('Myoglobin', BIO_HEART, 'TEXT'),
  t('Pro-BNP', BIO_HEART, 'TEXT'),
  t('CTNI', BIO_HEART, 'TEXT'),
  t('CTnT', BIO_HEART, 'TEXT'),

  // BIOCHEMISTRY — LIVER FUNCTION TESTS
  t('SGOT/AST', BIO_LIVER, 'NUMERIC'),
  t('SGPT/ALT', BIO_LIVER, 'NUMERIC'),
  t('ALP', BIO_LIVER, 'NUMERIC'),
  t('Bilirubin (Total & Direct)', BIO_LIVER, 'TEXT'),
  t('Calcium', BIO_LIVER, 'NUMERIC'),
  t('Total Serum protein/Albumin', BIO_LIVER, 'TEXT'),

  // BIOCHEMISTRY — KIDNEY FUNCTION TEST
  t('Creatinine – Creatinine Kinase', BIO_KIDNEY, 'TEXT'),
  t('Urea', BIO_KIDNEY, 'NUMERIC'),
  t('BUN', BIO_KIDNEY, 'NUMERIC'),
  t('Uric Acid', BIO_KIDNEY, 'NUMERIC'),

  // BIOCHEMISTRY — ELECTROLYTES PANEL
  t('Sodium Na+', BIO_ELECTRO, 'NUMERIC'),
  t('Potassium K+', BIO_ELECTRO, 'NUMERIC'),
  t('Chloride Cl-', BIO_ELECTRO, 'NUMERIC'),
  t('Calcium Ca++', BIO_ELECTRO, 'NUMERIC'),

  // BIOCHEMISTRY — PANCREATIC FUNCTION PANEL
  t('Lipase', BIO_PANCREAS, 'NUMERIC'),
  t('Amylase', BIO_PANCREAS, 'NUMERIC'),
  t('Bilirubin Total', BIO_PANCREAS, 'NUMERIC'),
  t('Bilirubin Direct', BIO_PANCREAS, 'NUMERIC'),

  // BIOCHEMISTRY — THYROID FUNCTION TESTS
  t('TSH (screening)', BIO_THYROID, 'NUMERIC'),
  t('T4 total', BIO_THYROID, 'NUMERIC'),
  t('T4 free', BIO_THYROID, 'NUMERIC'),
  t('TB Total', BIO_THYROID, 'NUMERIC'),

  // BIOCHEMISTRY — TUMAR MARKERS
  t('PSA, total', BIO_TUMOR, 'NUMERIC'),
  t('PSA free', BIO_TUMOR, 'NUMERIC'),
  t('CEA', BIO_TUMOR, 'NUMERIC'),
  t('AFP', BIO_TUMOR, 'NUMERIC'),

  // ============================================================
  // PAGE 2
  // ============================================================

  // NUTRITIONAL PANEL
  t('CBC', NUTRITIONAL, 'TEXT'),
  t('Iron', NUTRITIONAL, 'NUMERIC'),
  t('Folic Acid', NUTRITIONAL, 'NUMERIC'),
  t('Electrolyte panel', NUTRITIONAL, 'TEXT'),
  t('Platelet counts', NUTRITIONAL, 'NUMERIC'),

  // COAGULATION ACTIVITIES
  t('PT', COAG, 'TEXT'),
  t('APTT', COAG, 'TEXT'),
  t('Bleeding Time', COAG, 'TEXT'),
  t('D-Dimer', COAG, 'TEXT'),

  // INFERTILITY FEMALE
  t('FSH', INF_FEMALE, 'NUMERIC'),
  t('LH', INF_FEMALE, 'NUMERIC'),
  t('Prolactin', INF_FEMALE, 'NUMERIC'),
  t('Progesterone', INF_FEMALE, 'NUMERIC'),
  t('Testosterone', INF_FEMALE, 'NUMERIC'),
  t('TSH', INF_FEMALE, 'NUMERIC'),

  // INFERTILITY MALE
  t('Semen Analysis', INF_MALE, 'TEXT'),
  t('FSH', INF_MALE, 'NUMERIC'),
  t('LH', INF_MALE, 'NUMERIC'),
  t('Prolactin', INF_MALE, 'NUMERIC'),
  t('Testosterone', INF_MALE, 'NUMERIC'),

  // EARLY PREGNANCY CHECK UP
  t('CBC & Blood Group', EARLY_PREG, 'TEXT'),
  t('Glucose Random', EARLY_PREG, 'NUMERIC'),
  t('VDRL (non-treponemic)', EARLY_PREG, 'TEXT'),
  t('HIV 1+2 Ag', EARLY_PREG, 'TEXT'),
  t('HBsAg', EARLY_PREG, 'TEXT'),
  t('HCV (IgG+IgM)', EARLY_PREG, 'TEXT'),
  t('Malaria RDT & WIDAL', EARLY_PREG, 'TEXT'),
  t('Urinalysis and HCG', EARLY_PREG, 'TEXT'),
  t('B-HCG', EARLY_PREG, 'NUMERIC'),

  // COLORECTAL OCCUTE BLOOD TEST
  t('Fecal Occult Blood test', COLORECTAL, 'TEXT'),

  // ============================================================
  // URINALYSIS
  // ============================================================
  // MACROSCOPIC EXAMINATION
  t('Color', URINE_MACRO, 'TEXT'),
  t('Character', URINE_MACRO, 'TEXT'),

  // CHEMISTRY EXAMINATION
  t('Urobilinogen', URINE_CHEM, 'TEXT', undefined, '<0.1'),
  t('Bilirubin', URINE_CHEM, 'TEXT', undefined, 'Neg'),
  t('Ketone', URINE_CHEM, 'TEXT', undefined, '=100'),
  t('Glucose', URINE_CHEM, 'TEXT', undefined, 'Neg'),
  t('Protein', URINE_CHEM, 'TEXT', undefined, 'Neg'),
  t('Blood', URINE_CHEM, 'TEXT', undefined, 'Neg'),
  t('Nitrite', URINE_CHEM, 'TEXT', undefined, 'Neg'),
  t('pH', URINE_CHEM, 'TEXT', undefined, '5.0-8.0'),
  t('S.G.', URINE_CHEM, 'TEXT', undefined, '1.005-1.030'),
  t('Leukocytes', URINE_CHEM, 'TEXT', undefined, 'Neg'),

  // MICROSCOPIC EXAMINATION
  t('WBC', URINE_MICRO, 'TEXT', '/HPF'),
  t('RBC', URINE_MICRO, 'TEXT', '/HPF'),
  t('Ep. Cells', URINE_MICRO, 'TEXT', '/LPF'),
  t('Casts', URINE_MICRO, 'TEXT'),
  t('Crystals', URINE_MICRO, 'TEXT'),
  t('Parasite', URINE_MICRO, 'TEXT'),
  t('Yeasts', URINE_MICRO, 'TEXT'),
  t('Bacteria', URINE_MICRO, 'TEXT'),
  t('Others', URINE_MICRO, 'TEXT'),

  // ============================================================
  // PARASITOLOGY STOOL (WET MOUNT)
  // ============================================================
  // MACROSCOPIC EXAMINATION
  t('Color', STOOL_MACRO, 'TEXT'),
  t('Consistency', STOOL_MACRO, 'TEXT'),
  t('Mucoid', STOOL_MACRO, 'TEXT'),

  // MICROSCOPIC EXAMINATION
  t('WBC', STOOL_MICRO, 'TEXT', '/HPF'),
  t('RBC', STOOL_MICRO, 'TEXT', '/HPF'),
  t('Parasite (O/P)', STOOL_MICRO, 'TEXT'),
];

export const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
