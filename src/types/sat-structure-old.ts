// SAT Test Structure Types

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

// Complete SAT Structure
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
        maxScore: 200,
        weight: 0.35,
        skills: [
          {
            id: 'linear-equations-one-var',
            name: 'Linear Equations in One Variable',
            maxScore: 50
          },
          {
            id: 'linear-functions',
            name: 'Linear Functions',
            maxScore: 50
          },
          {
            id: 'linear-equations-two-var',
            name: 'Linear Equations in Two Variables',
            maxScore: 50
          },
          {
            id: 'systems-linear-equations',
            name: 'Systems of Two Linear Equations in Two Variables',
            maxScore: 50
          },
          {
            id: 'linear-inequalities',
            name: 'Linear Inequalities in One or Two Variables',
            maxScore: 50
          }
        ]
      },
      {
        id: 'advanced-math',
        name: 'Advanced Math',
        description: 'Nonlinear functions and complex equations',
        currentScore: 165,
        maxScore: 200,
        weight: 0.35,
        skills: [
          {
            id: 'nonlinear-functions',
            name: 'Nonlinear Functions',
            currentScore: 85,
            maxScore: 100
          },
          {
            id: 'nonlinear-equations-systems',
            name: 'Nonlinear Equations in One Variable and Systems of Equations in Two Variables',
            currentScore: 80,
            maxScore: 100
          }
        ]
      },
      {
        id: 'problem-solving-data-analysis',
        name: 'Problem-Solving & Data Analysis',
        description: 'Statistics, probability, and data interpretation',
        currentScore: 190,
        maxScore: 200,
        weight: 0.15,
        skills: [
          {
            id: 'ratios-rates-proportions',
            name: 'Ratios, Rates, Proportional Relationships, & Units',
            currentScore: 28,
            maxScore: 30
          },
          {
            id: 'percentages',
            name: 'Percentages',
            currentScore: 25,
            maxScore: 30
          },
          {
            id: 'one-variable-data',
            name: 'One-Variable Data: Distributions and Measures of Center and Spread',
            currentScore: 27,
            maxScore: 30
          },
          {
            id: 'two-variable-data',
            name: 'Two-Variable Data: Models and Scatterplots',
            currentScore: 26,
            maxScore: 30
          },
          {
            id: 'probability-conditional',
            name: 'Probability & Conditional Probability',
            currentScore: 22,
            maxScore: 25
          },
          {
            id: 'inference-statistics',
            name: 'Inference from Sample Statistics & Margin of Error',
            currentScore: 31,
            maxScore: 35
          },
          {
            id: 'statistical-claims',
            name: 'Evaluating Statistical Claims: Observational Studies and Experiments',
            currentScore: 20,
            maxScore: 25
          }
        ]
      },
      {
        id: 'geometry-trigonometry',
        name: 'Geometry & Trigonometry',
        description: 'Spatial reasoning and trigonometric relationships',
        currentScore: 135,
        maxScore: 200,
        weight: 0.15,
        skills: [
          {
            id: 'area-volume',
            name: 'Area & Volume',
            currentScore: 40,
            maxScore: 50
          },
          {
            id: 'lines-angles-triangles',
            name: 'Lines, Angles, & Triangles',
            currentScore: 35,
            maxScore: 50
          },
          {
            id: 'right-triangles-trigonometry',
            name: 'Right Triangles & Trigonometry',
            currentScore: 30,
            maxScore: 50
          },
          {
            id: 'circles',
            name: 'Circles',
            currentScore: 30,
            maxScore: 50
          }
        ]
      }
    ]
  },
  {
    id: 'english',
    name: 'English',
    description: 'Reading comprehension and language conventions',
    currentScore: 730,
    maxScore: 800,
    domains: [
      {
        id: 'information-ideas',
        name: 'Information & Ideas',
        description: 'Reading comprehension and analysis',
        currentScore: 185,
        maxScore: 200,
        weight: 0.26,
        skills: [
          {
            id: 'central-ideas-details',
            name: 'Central Ideas & Details',
            currentScore: 65,
            maxScore: 70
          },
          {
            id: 'inferences',
            name: 'Inferences',
            currentScore: 60,
            maxScore: 65
          },
          {
            id: 'command-evidence',
            name: 'Command of Evidence',
            currentScore: 60,
            maxScore: 65
          }
        ]
      },
      {
        id: 'craft-structure',
        name: 'Craft & Structure',
        description: 'Text analysis and rhetorical skills',
        currentScore: 175,
        maxScore: 200,
        weight: 0.28,
        skills: [
          {
            id: 'words-in-context',
            name: 'Words in Context',
            currentScore: 55,
            maxScore: 65
          },
          {
            id: 'text-structure-purpose',
            name: 'Text Structure & Purpose',
            currentScore: 60,
            maxScore: 70
          },
          {
            id: 'cross-text-connections',
            name: 'Cross-Text Connections',
            currentScore: 60,
            maxScore: 65
          }
        ]
      },
      {
        id: 'expression-ideas',
        name: 'Expression of Ideas',
        description: 'Writing and rhetorical effectiveness',
        currentScore: 180,
        maxScore: 200,
        weight: 0.20,
        skills: [
          {
            id: 'rhetorical-synthesis',
            name: 'Rhetorical Synthesis',
            currentScore: 90,
            maxScore: 100
          },
          {
            id: 'transitions',
            name: 'Transitions',
            currentScore: 90,
            maxScore: 100
          }
        ]
      },
      {
        id: 'standard-english-conventions',
        name: 'Standard English Conventions',
        description: 'Grammar, usage, and mechanics',
        currentScore: 190,
        maxScore: 200,
        weight: 0.26,
        skills: [
          {
            id: 'boundaries',
            name: 'Boundaries',
            currentScore: 95,
            maxScore: 100
          },
          {
            id: 'form-structure-sense',
            name: 'Form, Structure, and Sense',
            currentScore: 95,
            maxScore: 100
          }
        ]
      }
    ]
  }
];

// Helper functions
export function getSubjectById(id: string): SATSubject | undefined {
  return SAT_STRUCTURE.find(subject => subject.id === id);
}

export function getDomainById(subjectId: string, domainId: string): SATDomain | undefined {
  const subject = getSubjectById(subjectId);
  return subject?.domains.find(domain => domain.id === domainId);
}

export function getSkillById(subjectId: string, domainId: string, skillId: string): SATSkill | undefined {
  const domain = getDomainById(subjectId, domainId);
  return domain?.skills.find(skill => skill.id === skillId);
}

// Calculate domain score from skill averages
export function calculateDomainScore(domain: SATDomain): number {
  if (domain.skills.length === 0) return 0;
  
  const skillAverage = domain.skills.reduce((sum, skill) => {
    return sum + (skill.currentScore / skill.maxScore);
  }, 0) / domain.skills.length;
  
  return Math.round(skillAverage * domain.maxScore);
}

// Calculate subject score from weighted domain scores  
export function calculateSubjectScore(subject: SATSubject): number {
  let weightedScore = 0;
  
  for (const domain of subject.domains) {
    // Calculate domain score as percentage
    const domainScore = calculateDomainScore(domain);
    const domainPercentage = domainScore / domain.maxScore;
    
    // Apply weight and scale to 800 points
    weightedScore += domainPercentage * domain.weight * 800;
  }
  
  return Math.round(weightedScore);
}

// Calculate overall SAT score (sum of subjects)
export function calculateOverallScore(): number {
  return SAT_STRUCTURE.reduce((sum, subject) => {
    return sum + calculateSubjectScore(subject);
  }, 0);
}

// Recalculate all scores in the structure (useful for updating after changes)
export function recalculateAllScores(): SATSubject[] {
  return SAT_STRUCTURE.map(subject => ({
    ...subject,
    domains: subject.domains.map(domain => ({
      ...domain,
      currentScore: calculateDomainScore(domain)
    })),
    currentScore: calculateSubjectScore(subject)
  }));
}

export type PracticeLevel = 'subject' | 'domain' | 'skill';

export interface PracticeParams {
  level: PracticeLevel;
  subjectId: string;
  domainId?: string;
  skillId?: string;
}