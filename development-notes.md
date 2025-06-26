# Development Notes - Studii SAT Prep Application

## Current Status: Phase 4 Database Integration (Near Complete)

### Phase History Overview

#### **Phase 1-2**: Foundation & Authentication (Complete) ✅
- Landing page, authentication system, OAuth integration
- Next.js 15 setup with Supabase, protected routes

#### **Phase 3**: Dashboard & Data Architecture (Complete) ✅  
- Two-column dashboard layout, ranking system, filtering
- Data separation: static SAT structure vs user progress
- Score calculation optimization, bug fixes

#### **Phase 4**: Database Integration (Near Complete) ⚡
- 4/6 database schemas implemented with comprehensive utilities
- SAT API compatibility, question import ready
- Real database integration replacing dummy data

---

## Database Integration Status (Phase 4)

### Completed Database Schemas (4/6)

#### 1. User Skill Progress (`user_skill_progress`) ✅
**Purpose**: Store atomic skill-level scores per user
**Key Features**:
- SAT minimum score initialization (200 points)
- Automatic backfilling for new skills added to SAT_STRUCTURE
- Skills as the atomic data unit (domains/subjects calculated dynamically)

**Schema**:
```sql
user_skill_progress {
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  skill_id TEXT NOT NULL,
  current_score INTEGER (200-800 SAT scale),
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
}
```

**Database Functions** (8 total):
- `getUserSkillProgress()` - Get all skills with auto-initialization
- `getUserSkillScore()` - Get individual skill score
- `hasUserProgress()` - Check if user has any progress
- `upsertUserSkillProgress()` - Update or insert skill progress
- `initializeUserProgress()` - Bulk insert for new users
- `backfillMissingSkills()` - Add new skills to existing users
- `getUserProgressDetails()` - Get detailed progress with metadata

#### 2. Quiz Sessions (`quiz_sessions`) ✅
**Purpose**: Track continuous practice sessions with multiple rounds
**Key Features**:
- Support for continuous practice (multiple 10-question rounds per session)
- Session state tracking (started vs completed)
- Hierarchical practice (subject/domain/skill levels)

**Schema**:
```sql
quiz_sessions {
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_type TEXT CHECK (session_type IN ('subject', 'domain', 'skill')),
  target_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
}
```

**Database Functions** (8 total):
- `createQuizSession()` - Start new session
- `updateQuizSession()` - Update session progress  
- `completeQuizSession()` - Mark session complete with final stats
- `getUserQuizSessions()` - Get user's session history
- `getCompletedSessionsForTarget()` - Get sessions for specific subject/domain/skill
- `getActiveQuizSession()` - Find incomplete session for resuming
- `getUserSessionStats()` - Calculate comprehensive user statistics

#### 3. User Session Answers (`user_session_answers`) ✅
**Purpose**: Track individual question attempts within sessions
**Key Features**:
- Granular question-level tracking with timing
- Skill and difficulty level per question
- Support for retry attempts
- Detailed analytics for adaptive learning

**Schema**:
```sql
user_session_answers {
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES quiz_sessions(id),
  question_id UUID NOT NULL,
  skill_id TEXT NOT NULL,
  difficulty_level INTEGER (1-7 SAT scale),
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  answered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP
}
```

**Database Functions** (7 total):
- `recordUserAnswer()` - Save individual question attempt
- `getSessionAnswers()` - Get all answers for a session
- `getUserSkillPerformance()` - Track performance on specific skills
- `getIncorrectAnswersForReview()` - Find questions needing review
- `getDetailedSkillStats()` - Deep analytics with trends and difficulty breakdown
- `getUserAnsweredQuestions()` - Prevent question repeats

#### 4. Questions (`questions`) ✅
**Purpose**: Store SAT question content with full API compatibility
**Key Features**:
- Origin tracking (SAT official vs custom questions)
- Rich HTML content support (including SVG figures)
- JSONB answer options for flexible MCQ structure
- SAT's native 1-7 difficulty scale
- Complete metadata preservation from SAT API

**Schema**:
```sql
questions {
  id UUID PRIMARY KEY,
  origin_id TEXT DEFAULT 'custom',           -- 'sat_official', 'custom', etc.
  external_id TEXT,                          -- SAT's external_id
  source_question_id TEXT,                   -- SAT's questionId (short form)
  question_text TEXT NOT NULL,               -- SAT's 'stem'
  stimulus TEXT,                             -- SAT's 'stimulus' (passages/figures)
  question_type TEXT DEFAULT 'mcq',          -- 'mcq', 'grid_in', 'free_response'
  skill_id TEXT NOT NULL,                    -- Maps to SAT_STRUCTURE
  sat_skill_code TEXT,                       -- Original SAT code (e.g., 'H.D.')
  sat_domain_code TEXT,                      -- SAT domain (e.g., 'H' for Algebra)
  sat_program TEXT DEFAULT 'SAT',            -- SAT, P10, P89
  difficulty_level INTEGER (1-7),           -- SAT's score_band_range_cd
  sat_difficulty_letter TEXT,               -- E, M, H
  sat_score_band INTEGER (1-7),             -- Original score_band_range_cd
  answer_options JSONB,                      -- [{id, content, is_correct}]
  correct_answers TEXT[] NOT NULL,           -- ['C'] or ['2.5'] for grid-in
  explanation TEXT,                          -- SAT's 'rationale'
  est_time_seconds INTEGER DEFAULT 90,
  tags TEXT[],                               -- Additional categorization
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  sat_create_date BIGINT,                    -- SAT's createDate
  sat_update_date BIGINT                     -- SAT's updateDate
}
```

**Database Functions** (8 total):
- `createQuestion()` - Add new question
- `getQuestionById()` - Get single question
- `getQuestionsForPractice()` - Smart selection avoiding repeats
- `getQuestionsBySkill()` - Flexible filtering by skill/difficulty
- `searchQuestions()` - Full-text content search
- `importSATQuestion()` - Direct SAT API data import with mapping
- `getQuestionStats()` - Question bank analytics
- `questionExistsByExternalId()` - Duplicate prevention for scraping

### Pending Database Schemas (2/6)

#### 5. User Profiles (`user_profiles`) - Next Priority
**Purpose**: Extended user data beyond Supabase auth
**Planned Features**:
- Display names and study preferences
- Goal tracking and study streaks
- Notification settings

#### 6. Score Cache (`score_cache`) - Future Optimization
**Purpose**: Performance optimization for heavy calculations
**Use Case**: When user base grows and on-demand calculations become bottleneck

---

## SAT API Integration Architecture

### Official SAT Question API Endpoints

#### Overview Endpoint
**URL**: `https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions`
**Parameters**:
```json
{
  "asmtEventId": 99,    // 99=SAT, 100=P10, 102=P89
  "test": 1,            // 1=English, 2=Math  
  "domain": "CAS"       // Domain code (see mapping below)
}
```

**Response**: Array of question metadata
```json
{
  "questionId": "3f5a3602",
  "external_id": "00d5ab1d-b64c-4161-97b7-890e404262ac", 
  "skill_cd": "H.D.",
  "skill_desc": "Systems of two linear equations in two variables",
  "primary_class_cd": "H",
  "primary_class_cd_desc": "Algebra",
  "difficulty": "H",
  "score_band_range_cd": 6,
  "program": "SAT",
  "createDate": 1730147357393,
  "updateDate": 1730147357393
}
```

#### Detailed Question Endpoint
**URL**: Same as overview
**Parameters**:
```json
{
  "external_id": "6537fc25-1318-49e9-9e1e-dcc07604c519"
}
```

**Response**: Complete question content
```json
{
  "stem": "<p>Question text here</p>",
  "stimulus": "<figure>...SVG or HTML content...</figure><p>Passage text</p>", 
  "type": "mcq",
  "answerOptions": [
    {"id": "uuid1", "content": "<p>Choice A</p>"},
    {"id": "uuid2", "content": "<p>Choice B</p>"},
    {"id": "uuid3", "content": "<p>Choice C</p>"},
    {"id": "uuid4", "content": "<p>Choice D</p>"}
  ],
  "keys": ["uuid3"],              // IDs of correct answers
  "correct_answer": ["C"],        // Letter equivalents
  "rationale": "<p>Explanation of correct answer</p>",
  "externalid": "external-uuid"
}
```

### SAT Domain Code Mapping

#### Math Domains
- **H** = Algebra
- **P** = Advanced Math  
- **Q** = Problem Solving and Data Analysis
- **S** = Geometry and Trigonometry

#### English Domains
- **INI** = Information and Ideas
- **CAS** = Craft and Structure
- **EOI** = Expression of Ideas
- **SEC** = Standard English Conventions

### SAT Skill Code to Internal Mapping

**Complete mapping implemented in `src/utils/sat-skill-mapping.ts`**:

#### Math Skills
```typescript
// Algebra (H)
'H.A.' → 'linear-equations-one-var'
'H.B.' → 'linear-functions'
'H.C.' → 'linear-equations-two-var'  
'H.D.' → 'systems-linear-equations'
'H.E.' → 'linear-inequalities'

// Advanced Math (P)
'P.A.' → 'nonlinear-functions'
'P.B.' → 'nonlinear-equations-systems'
'P.C.' → 'equivalent-expressions'

// Problem Solving & Data Analysis (Q)
'Q.A.' → 'ratios-rates-proportions'
'Q.B.' → 'percentages'
'Q.C.' → 'one-variable-data'
'Q.D.' → 'two-variable-data'
'Q.E.' → 'probability-conditional'
'Q.F.' → 'inference-statistics'
'Q.G.' → 'statistical-claims'

// Geometry & Trigonometry (S)
'S.A.' → 'area-volume'
'S.B.' → 'lines-angles-triangles'
'S.C.' → 'right-triangles-trigonometry'
'S.D.' → 'circles'
```

#### English Skills
```typescript
// Information & Ideas (INI)
'INI.A.' → 'central-ideas-details'
'INI.B.' → 'inferences'
'INI.C.' → 'command-evidence'

// Craft & Structure (CAS)
'CAS.A.' → 'words-in-context'
'CAS.B.' → 'text-structure-purpose'
'CAS.C.' → 'cross-text-connections'

// Expression of Ideas (EOI)
'EOI.A.' → 'rhetorical-synthesis'
'EOI.B.' → 'transitions'

// Standard English Conventions (SEC)
'SEC.A.' → 'boundaries'
'SEC.B.' → 'form-structure-sense'
```

### SAT Difficulty System Implementation

#### SAT's Native Scale (Used Directly)
- **Score Band Range**: 1-7 (stored in `difficulty_level`)
- **Letter Grades**: E (Easy), M (Medium), H (Hard)
- **Mapping**: E=1-3, M=4-5, H=6-7

#### Database Storage Strategy
```sql
difficulty_level INTEGER (1-7),           -- Primary field for queries
sat_difficulty_letter TEXT,               -- E/M/H for reference  
sat_score_band INTEGER (1-7)              -- Original score_band_range_cd
```

#### Import Logic
```typescript
// Primary: Use score_band_range_cd directly
let difficultyLevel = satQuestion.score_band_range_cd || 4

// Fallback: Map letters to approximate bands
if (!satQuestion.score_band_range_cd && satQuestion.difficulty) {
  const letterToBandMap = { 'E': 2, 'M': 4, 'H': 6 }
  difficultyLevel = letterToBandMap[satQuestion.difficulty] || 4
}
```

---

## Question Import Process (Production Ready)

### 1. Bulk Import Workflow
```typescript
// 1. Fetch question overview for domain
const overviewResponse = await fetch(SAT_API_URL, {
  method: 'POST',
  body: JSON.stringify({
    "asmtEventId": 99,
    "test": 1,      // Math
    "domain": "H"   // Algebra
  })
})

// 2. Check for existing questions to avoid duplicates
for (const questionMeta of overviewResponse) {
  const exists = await questionExistsByExternalId(questionMeta.external_id)
  if (exists) continue // Skip existing questions
  
  // 3. Fetch detailed question content
  const detailResponse = await fetch(SAT_API_URL, {
    method: 'POST', 
    body: JSON.stringify({
      "external_id": questionMeta.external_id
    })
  })
  
  // 4. Import with automatic mapping
  const question = await importSATQuestion({
    ...questionMeta,
    ...detailResponse
  })
}
```

### 2. Data Validation & Error Handling
- **Skill Mapping Validation**: Ensures SAT skill codes map to valid internal skill IDs
- **Duplicate Prevention**: `questionExistsByExternalId()` prevents re-imports
- **Content Validation**: Database constraints ensure data integrity
- **Error Logging**: Comprehensive error tracking for failed imports

### 3. Content Preservation
- **Rich HTML**: Full preservation of SAT's complex formatting
- **SVG Figures**: Complete mathematical diagrams and charts
- **Answer Structure**: Maintains SAT's UUID-based answer option system
- **Metadata**: All SAT timestamps, codes, and identifiers preserved

---

## Phase 3 Architecture Accomplishments (Historical)

### 🎯 **Major Achievements**

#### **1. Dashboard Layout Restructuring**
- **Two-column responsive layout**: Math domains on left, English domains on right
- **Skills at bottom**: All skills displayed in 3-column grid with appropriate subject/domain headings
- **Rank icons**: Positioned on right side of skill cards (better visual balance)
- **Responsive design**: Collapses to single column on mobile, 2 columns on tablet, 3 columns on desktop

#### **2. Data Architecture Refactoring** 
- **Separated concerns**: Split static SAT structure from user progress data
- **Clean structure**: `/src/types/sat-structure.ts` contains only static data (no currentScore)
- **User progress**: `/src/data/dummy-progress.ts` contains skill-level scores only
- **Score calculations**: `/src/utils/score-calculations.ts` with individual functions
- **Removed complexity**: Eliminated heavy `enrichSATStructure()` in favor of on-demand calculations

#### **3. Scoring System Optimization**
- **Consistent scaling**: All domains and subjects max at 800 points
- **Skills remain atomic**: Individual max scores (25-100 points) - skill level data
- **Domain calculation**: Skill averages scaled to 800 points
- **Subject calculation**: Weighted domain averages using real SAT percentages
- **Overall calculation**: Simple sum of Math + English subjects (max 1600)

#### **4. Critical Bug Fix - Filtering Score Consistency**
- **Issue**: When filtering by domain, subject scores changed due to incomplete domain data
- **Root cause**: `filteredContent` created modified subjects with only filtered domains
- **Solution**: Always use original complete subject structure for score calculations
- **Fix**: `calculateSubjectScore(getSubjectById(subject.id)!, userProgress)` instead of filtered subject

### 🏗️ **Component Architecture**

#### **Dashboard Components** (`/src/components/dashboard/`)
- **DashboardContent**: Main orchestration, handles filtering logic
- **SubjectCard**: Displays subject overview with calculated scores
- **DomainCard**: Shows domain progress, accepts `userProgress` prop
- **SkillCard**: Individual skill display with rank icons, accepts `userProgress` prop  
- **DashboardFilter**: Search and filter functionality
- **AllTopicsCard**: Overall SAT score summary

#### **Data Flow Pattern**
```typescript
// Clean data flow - no heavy objects
Dashboard Page → userProgress → Components → Individual calculations
```

---

## Database Performance Optimizations

### Implemented Indexes
```sql
-- User skill progress
CREATE INDEX idx_user_skill_progress_user_id ON user_skill_progress(user_id);
CREATE INDEX idx_user_skill_progress_skill ON user_skill_progress(skill_id);

-- Quiz sessions
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_target ON quiz_sessions(session_type, target_id);
CREATE INDEX idx_quiz_sessions_completed ON quiz_sessions(user_id, completed_at DESC) WHERE is_completed = true;

-- Session answers
CREATE INDEX idx_session_answers_session_id ON user_session_answers(session_id);
CREATE INDEX idx_session_answers_skill ON user_session_answers(skill_id, is_correct);
CREATE INDEX idx_session_answers_difficulty ON user_session_answers(skill_id, difficulty_level, is_correct);

-- Questions
CREATE INDEX idx_questions_skill_difficulty ON questions(skill_id, difficulty_level, is_active);
CREATE INDEX idx_questions_external_id ON questions(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_questions_search ON questions USING GIN (to_tsvector('english', question_text || ' ' || COALESCE(stimulus, '')));
```

### Row Level Security (RLS)
- **User Progress**: Users only see their own skill progress
- **Quiz Sessions**: Users only access their own sessions
- **Session Answers**: Answers linked to user's sessions only
- **Questions**: Publicly readable, admin-only write (development: all authenticated users)

---

## Next Development Priorities

### Immediate (Current Session)
1. **Complete Phase 4**: Create `user_profiles` schema
2. **Question Population**: Begin SAT question scraping and import
3. **Quiz Integration**: Connect existing quiz UI to database schemas

### Short Term (Next 1-2 Sessions)
1. **Adaptive Question Selection**: Use analytics to adjust difficulty
2. **Progress Updates**: Real-time skill score updates from quiz results
3. **Review System**: Implement spaced repetition for incorrect answers

### Medium Term (Next 3-5 Sessions)  
1. **SAT Question Scraping**: Automated import from official API
2. **Custom Question Creation**: Tools for adding original content
3. **Advanced Analytics**: Learning trends and performance insights

### Long Term (Future Phases)
1. **Score Caching**: Implement `score_cache` table for performance
2. **ML Recommendations**: Adaptive learning algorithm
3. **Social Features**: Study groups and leaderboards

---

## Technical Implementation Notes

### Database Connection Pattern
```typescript
// Always use server-side client for database operations
const supabase = await createClient() // from @/utils/supabase/server

// Typed queries with Database interface
const { data, error } = await supabase
  .from('questions')
  .select('*')
  .eq('skill_id', skillId)
  .eq('is_active', true)
```

### Error Handling Strategy
```typescript
// Consistent error handling across all database functions
if (error) {
  console.error('Error description:', error)
  return null // or appropriate fallback
}
```

### Data Type Consistency
- **UUIDs**: All primary keys and foreign keys
- **Timestamps**: TIMESTAMP WITH TIME ZONE for all time fields
- **JSON**: JSONB for complex data structures (answer_options, tags)
- **Arrays**: TEXT[] for simple lists (correct_answers, tags)
- **Constraints**: Database-level validation for data integrity

This comprehensive database architecture provides the foundation for a production-ready SAT prep application with full question bank management, detailed progress tracking, and seamless integration with official SAT content.