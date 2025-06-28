// SAT Test Structure Types (Static Structure Only)

export interface SATSkill {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
}

export interface SATDomain {
  id: string;
  name: string;
  description?: string;
  skills: SATSkill[];
  displaySkills?: SATSkill[];
  maxScore: number;
  weight: number; // Percentage weight in subject (e.g., 0.35 for 35%)
}

export interface SATSubject {
  id: string;
  name: string;
  description?: string;
  domains: SATDomain[];
  maxScore: number;
}

// Complete SAT Structure (Static - No User Progress)
export const SAT_STRUCTURE: SATSubject[] = [
  {
    id: 'math',
    name: 'Math',
    description: 'Mathematical reasoning and problem-solving',
    maxScore: 800,
    domains: [
      {
        id: 'algebra',
        name: 'Algebra',
        description: 'Linear equations, functions, and systems',
        maxScore: 800,
        weight: 0.35,
        skills: [
          {
            id: 'linear-equations-one-var',
            name: 'Linear Equations in One Variable',
            maxScore: 800
          },
          {
            id: 'linear-functions',
            name: 'Linear Functions',
            maxScore: 800
          },
          {
            id: 'linear-equations-two-var',
            name: 'Linear Equations in Two Variables',
            maxScore: 800
          },
          {
            id: 'systems-linear-equations',
            name: 'Systems of Two Linear Equations in Two Variables',
            maxScore: 800
          },
          {
            id: 'linear-inequalities',
            name: 'Linear Inequalities in One or Two Variables',
            maxScore: 800
          }
        ]
      },
      {
        id: 'advanced-math',
        name: 'Advanced Math',
        description: 'Nonlinear functions and complex equations',
        maxScore: 800,
        weight: 0.35,
        skills: [
          {
            id: 'nonlinear-functions',
            name: 'Nonlinear Functions',
            maxScore: 800
          },
          {
            id: 'nonlinear-equations-systems',
            name: 'Nonlinear Equations in One Variable & Systems of Equations in Two Variables',
            maxScore: 800
          },
          {
            id: 'equivalent-expressions',
            name: 'Equivalent Expressions',
            maxScore: 800
          }
        ]
      },
      {
        id: 'problem-solving-data-analysis',
        name: 'Problem-Solving & Data Analysis',
        description: 'Statistics, probability, and data interpretation',
        maxScore: 800,
        weight: 0.15,
        skills: [
          {
            id: 'ratios-rates-proportions',
            name: 'Ratios, Rates, Proportional Relationships, & Units',
            maxScore: 800
          },
          {
            id: 'percentages',
            name: 'Percentages',
            maxScore: 800
          },
          {
            id: 'one-variable-data',
            name: 'One-Variable Data: Distributions & Measures of Center & Spread',
            maxScore: 800
          },
          {
            id: 'two-variable-data',
            name: 'Two-Variable Data: Models & Scatterplots',
            maxScore: 800
          },
          {
            id: 'probability-conditional',
            name: 'Probability & Conditional Probability',
            maxScore: 800
          },
          {
            id: 'inference-statistics',
            name: 'Inference from Sample Statistics & Margin of Error',
            maxScore: 800
          },
          {
            id: 'statistical-claims',
            name: 'Evaluating Statistical Claims: Observational Studies & Experiments',
            maxScore: 800
          }
        ]
      },
      {
        id: 'geometry-trigonometry',
        name: 'Geometry & Trigonometry',
        description: 'Spatial reasoning and trigonometric relationships',
        maxScore: 800,
        weight: 0.15,
        skills: [
          {
            id: 'area-volume',
            name: 'Area & Volume',
            maxScore: 800
          },
          {
            id: 'lines-angles-triangles',
            name: 'Lines, Angles, & Triangles',
            maxScore: 800
          },
          {
            id: 'right-triangles-trigonometry',
            name: 'Right Triangles & Trigonometry',
            maxScore: 800
          },
          {
            id: 'circles',
            name: 'Circles',
            maxScore: 800
          }
        ]
      }
    ]
  },
  {
    id: 'english',
    name: 'English',
    description: 'Reading comprehension and language conventions',
    maxScore: 800,
    domains: [
      {
        id: 'information-ideas',
        name: 'Information & Ideas',
        description: 'Reading comprehension and analysis',
        maxScore: 800,
        weight: 0.26,
        skills: [
          {
            id: 'central-ideas-details',
            name: 'Central Ideas & Details',
            maxScore: 800
          },
          {
            id: 'inferences',
            name: 'Inferences',
            maxScore: 800
          },
          {
            id: 'command-evidence',
            name: 'Command of Evidence',
            maxScore: 800
          }
        ]
      },
      {
        id: 'craft-structure',
        name: 'Craft & Structure',
        description: 'Text analysis and rhetorical skills',
        maxScore: 800,
        weight: 0.28,
        skills: [
          {
            id: 'words-in-context',
            name: 'Words in Context',
            maxScore: 800
          },
          {
            id: 'text-structure-purpose',
            name: 'Text Structure & Purpose',
            maxScore: 800
          },
          {
            id: 'cross-text-connections',
            name: 'Cross-Text Connections',
            maxScore: 800
          }
        ]
      },
      {
        id: 'expression-ideas',
        name: 'Expression of Ideas',
        description: 'Writing and rhetorical effectiveness',
        maxScore: 800,
        weight: 0.20,
        skills: [
          {
            id: 'rhetorical-synthesis',
            name: 'Rhetorical Synthesis',
            maxScore: 800
          },
          {
            id: 'transitions',
            name: 'Transitions',
            maxScore: 800
          }
        ]
      },
      {
        id: 'standard-english-conventions',
        name: 'Standard English Conventions',
        description: 'Grammar, usage, and mechanics',
        maxScore: 800,
        weight: 0.26,
        skills: [
          {
            id: 'boundaries',
            name: 'Boundaries',
            maxScore: 800
          },
          {
            id: 'form-structure-sense',
            name: 'Form, Structure, and Sense',
            maxScore: 800
          }
        ]
      }
    ]
  }
];

// Create lookup maps for faster access with hierarchy information
const domainMap = new Map<string, { domain: SATDomain; subject: SATSubject }>();
const skillMap = new Map<string, { skill: SATSkill; domain: SATDomain; subject: SATSubject }>();

// Initialize maps
SAT_STRUCTURE.forEach(subject => {
  subject.domains.forEach(domain => {
    domainMap.set(domain.id, {domain, subject});
    
    domain.skills.forEach(skill => {
      skillMap.set(skill.id, {skill, domain, subject});
    });
  });
});

// Helper functions
export function getSubjectById(id: string): SATSubject | undefined {
  return SAT_STRUCTURE.find(subject => subject.id === id);
}

export function getAllSkillIds(): string[] {
  return SAT_STRUCTURE.flatMap(subject => 
    subject.domains.flatMap(domain => 
      domain.skills.map(skill => skill.id)
    )
  );
}

export function getDomainById(domainId: string): SATDomain | undefined {
  return domainMap.get(domainId)?.domain;
}

export function getSkillById(skillId: string): SATSkill | undefined {
  return skillMap.get(skillId)?.skill;
}

// Fast lookup functions that preserve hierarchy information
export function getDomainHierarchy(domainId: string): { domain: SATDomain; subject: SATSubject } | undefined {
  const result = domainMap.get(domainId);
  return result;
}

export function getSkillHierarchy(skillId: string): { skill: SATSkill; domain: SATDomain; subject: SATSubject } | undefined {
  const result = skillMap.get(skillId);
  return result;
}

export type PracticeLevel = 'subject' | 'domain' | 'skill';

export interface PracticeParams {
  level: PracticeLevel;
  subjectId: string;
  domainId?: string;
  skillId?: string;
}