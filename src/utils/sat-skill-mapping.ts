// SAT Skill Code Mapping
// Maps official SAT skill codes to our internal skill IDs

export const SAT_SKILL_CODE_MAPPING: Record<string, string> = {
  // MATH - Algebra (H)
  'H.A.': 'linear-equations-one-var',
  'H.B.': 'linear-functions', 
  'H.C.': 'linear-equations-two-var',
  'H.D.': 'systems-linear-equations',
  'H.E.': 'linear-inequalities',
  
  // MATH - Advanced Math (P) 
  'P.A.': 'nonlinear-functions',
  'P.B.': 'nonlinear-equations-systems',
  'P.C.': 'equivalent-expressions', // Your new skill
  
  // MATH - Problem Solving & Data Analysis (Q)
  'Q.A.': 'ratios-rates-proportions',
  'Q.B.': 'percentages',
  'Q.C.': 'one-variable-data',
  'Q.D.': 'two-variable-data', 
  'Q.E.': 'probability-conditional',
  'Q.F.': 'inference-statistics',
  'Q.G.': 'statistical-claims',
  
  // MATH - Geometry & Trigonometry (S)
  'S.A.': 'area-volume',
  'S.B.': 'lines-angles-triangles',
  'S.C.': 'right-triangles-trigonometry',
  'S.D.': 'circles',
  
  // ENGLISH - Information & Ideas (INI)
  'INI.A.': 'central-ideas-details',
  'INI.B.': 'inferences', 
  'INI.C.': 'command-evidence',
  
  // ENGLISH - Craft & Structure (CAS)
  'CAS.A.': 'words-in-context',
  'CAS.B.': 'text-structure-purpose',
  'CAS.C.': 'cross-text-connections',
  
  // ENGLISH - Expression of Ideas (EOI)
  'EOI.A.': 'rhetorical-synthesis',
  'EOI.B.': 'transitions',
  
  // ENGLISH - Standard English Conventions (SEC)
  'SEC.A.': 'boundaries',
  'SEC.B.': 'form-structure-sense'
}

// Reverse mapping for looking up SAT codes from our skill IDs
export const SKILL_ID_TO_SAT_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(SAT_SKILL_CODE_MAPPING).map(([code, skillId]) => [skillId, code])
)

// Helper function to get skill ID from SAT skill code
export function getSkillIdFromSATCode(satSkillCode: string): string | null {
  return SAT_SKILL_CODE_MAPPING[satSkillCode] || null
}

// Helper function to get SAT skill code from our skill ID
export function getSATCodeFromSkillId(skillId: string): string | null {
  return SKILL_ID_TO_SAT_CODE[skillId] || null
}

// Validate if a SAT skill code is supported
export function isSupportedSATSkillCode(satSkillCode: string): boolean {
  return satSkillCode in SAT_SKILL_CODE_MAPPING
}

// Get all supported SAT skill codes
export function getSupportedSATSkillCodes(): string[] {
  return Object.keys(SAT_SKILL_CODE_MAPPING)
}

// Get mapping statistics
export function getSATMappingStats(): {
  total_mappings: number;
  math_skills: number;
  english_skills: number;
  by_domain: Record<string, number>;
} {
  const codes = Object.keys(SAT_SKILL_CODE_MAPPING)
  
  const stats = {
    total_mappings: codes.length,
    math_skills: codes.filter(code => ['H', 'P', 'Q', 'S'].includes(code.split('.')[0])).length,
    english_skills: codes.filter(code => ['INI', 'CAS', 'EOI', 'SEC'].includes(code.split('.')[0])).length,
    by_domain: {} as Record<string, number>
  }
  
  codes.forEach(code => {
    const domain = code.split('.')[0]
    stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1
  })
  
  return stats
}