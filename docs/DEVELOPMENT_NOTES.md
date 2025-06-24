# Studii Development Notes

## Project Overview
**Studii** - SAT quiz application for comprehensive test preparation
**Repository**: https://github.com/SFang-cmd/studii

---

## Current Session Progress (Date: 2025-06-24)

### ✅ Completed Features

#### **1. Authentication System** (Complete)
- **Email/Password Authentication**: Fully functional signup/login with Supabase
- **OAuth Integration**: Google and Facebook social login with proper branding
- **Server Actions**: Template pattern for extensible OAuth providers
- **Dynamic Navigation**: Navbar changes based on authentication state
- **User Management**: Profile dropdown with logout functionality
- **Error Handling**: User-friendly error messages and validation
- **Session Management**: SSR-compatible authentication with proper cookie handling
- **Route Protection**: Middleware protecting dashboard and practice pages

#### **2. Complete Dashboard & Quiz System** (Complete)
- **SAT Structure Implementation**: Full hierarchical organization
  - **2 Subjects**: Math, English
  - **8 Content Domains**: Algebra, Advanced Math, Problem-Solving & Data Analysis, Geometry & Trigonometry, Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions
  - **35+ Individual Skills**: Complete breakdown of each domain into specific skills
- **Interactive Dashboard**: User greeting, progress overview, organized content display
- **Advanced Filtering System**: Search + subject/domain filters with condensed horizontal UI
- **6-Tier Rank System**: Bronze → Silver → Gold → Jade → Ruby → Diamond with geometric progression
- **Complete Quiz Interface**: Question/answer flow with progress tracking and explanations
- **Dynamic Practice Routes**: Single `/practice/[[...params]]` page handles all practice levels

#### **3. Component Architecture Refactor** (Complete)
- **Organized by Use-Case**: 
  - `components/dashboard/` - Dashboard-specific components
  - `components/quiz/` - Quiz-specific components  
  - `components/shared/` - Reusable components
- **Clean Exports**: Index files for easier imports
- **Single Dynamic Route**: Consolidated 3 practice pages into 1 catch-all route

### 🔄 Next Immediate Steps

#### **Phase 3: Database Integration (Priority 1)**
1. **Supabase Schema Design**:
   - Create tables for questions, user progress, quiz sessions
   - Define relationships between subjects, domains, skills
   - Implement user scoring and progress tracking
   
2. **Question Bank Implementation**:
   - Replace dummy data with real SAT questions
   - Import question bank with proper categorization
   - Implement question selection algorithms
   
3. **Progress Persistence**:
   - Save user scores and progress to database
   - Track performance across different skill areas
   - Implement rank progression based on actual performance

#### **Phase 4: Advanced Features (Priority 2)**
1. **Analytics Dashboard**:
   - Performance insights and trends
   - Weakness identification and recommendations
   - Detailed progress reports
   
2. **Adaptive Learning**:
   - Question difficulty adjustment based on performance
   - Personalized study paths
   - Smart question selection algorithms

#### **Future Authentication Enhancements (Lower Priority)**
1. **Forgot Password Flow**:
   - Complete password reset functionality
   - Email template customization
   
2. **Enhanced Profile Customization**:
   - User profile photo upload
   - Personal study preferences
   - Goal setting and tracking
   
3. **Additional OAuth Providers**:
   - GitHub (popular with students/developers)
   - Discord (popular with younger users)
   - Additional providers as needed

---

## Technical Decisions Made

### **Authentication Strategy**
- **Email confirmation required** for new signups
- **Social login implemented**: Google and Facebook OAuth with proper branding
- **Template pattern**: Extensible OAuth system for easy addition of new providers
- **Route structure**: Public (/, /auth/*) vs Private (/dashboard, /practice, etc.)
- **Session management**: Cookie-based with Supabase SSR and proper error handling
- **User experience**: Dynamic navigation and seamless auth state management

### **Design System**
- **Framework**: Next.js 15 App Router with TypeScript
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **Fonts**: Google Fonts (Carlito, Carattere) with proper optimization
- **Color consistency**: CSS variables for theme management

### **Project Structure**
- **Main app**: Located in `studii/` subdirectory (not root)
- **Authentication pages**: App Router structure (`/auth/login`, `/auth/signup`)
- **Supabase clients**: Organized by usage (browser, server, middleware)

---

## Critical Development Notes & Warnings ⚠️

### **Next.js 15 Specific Requirements**
- **Async Params**: Always use `await params` in dynamic routes - `const { subject } = await params;`
- **Middleware-Only Auth**: Remove redundant auth checks in pages - middleware handles all authentication
- **Component Imports**: Use organized imports - `import { NavBar } from '@/components/shared'`

### **SAT Structure Implementation**
- **Hierarchical Data**: All components expect Subject → Domain → Skill structure from `sat-structure.ts`
- **Rank Calculations**: Progress bars show within-tier progress, not total progress
- **Dynamic Routing**: Single `/practice/[[...params]]` handles all practice levels
- **Filter Logic**: Search queries match across all levels (subjects, domains, skills)

### **Component Organization Rules**
- **Dashboard components**: Only import from `components/dashboard/`
- **Quiz components**: Only import from `components/quiz/`
- **Shared components**: Reusable across multiple areas
- **Index files**: Use for clean imports - `import { SubjectCard } from '@/components/dashboard'`

### **Performance Considerations**
- **Server Components**: Keep most components server-side for better performance
- **Client Components**: Only use 'use client' when absolutely necessary (filters, interactive state)
- **Middleware Auth**: More performant than page-level auth checks
- **Condensed UI**: Horizontal layouts perform better than collapsible sections

---

## Important Development Notes

### **Server Development**
- **Claude Code limitation**: Dev server shows timeout but works locally
- **Commands**: Always run from `studii/` subdirectory
- **Build verification**: `npm run build` confirms no TypeScript errors

### **Authentication Flow Design**
```
New User Journey:
Landing → Get Started → Signup → Email Confirmation → Dashboard

Returning User Journey:
Landing → Login → Dashboard

Social Login Journey:
Auth page → Provider OAuth → Auto-confirmation → Dashboard
```

### **Supabase Configuration Required**
- **Dashboard setup**: Enable email confirmations
- **OAuth providers**: Configure Google, LinkedIn, Facebook apps
- **Email templates**: Customize confirmation emails for Studii branding
- **Database tables**: Will need users, topics, questions, progress tables

---

## Code Architecture Notes

### **File Organization**
```
src/
├── app/
│   ├── page.tsx (landing)
│   ├── layout.tsx (fonts: Carlito, Carattere)
│   ├── globals.css (color scheme + auth button styles)
│   ├── dashboard/page.tsx (protected, SAT structure dashboard)
│   ├── practice/[[...params]]/page.tsx (dynamic practice routes)
│   ├── profile/page.tsx (protected)
│   └── auth/
│       ├── actions.ts (server actions for auth/OAuth)
│       ├── callback/route.ts (OAuth callback handler)
│       ├── login/page.tsx (with OAuth buttons)
│       └── signup/page.tsx (with OAuth buttons)
├── components/
│   ├── dashboard/
│   │   ├── index.ts (clean exports)
│   │   ├── subject-card.tsx
│   │   ├── domain-card.tsx
│   │   ├── skill-card.tsx
│   │   ├── all-topics-card.tsx
│   │   ├── dashboard-filter.tsx
│   │   └── dashboard-content.tsx
│   ├── quiz/
│   │   ├── index.ts (clean exports)
│   │   ├── quiz-interface.tsx
│   │   ├── quiz-progress-bar.tsx
│   │   ├── question-card.tsx
│   │   └── answer-explanation.tsx
│   └── shared/
│       ├── index.ts (clean exports)
│       ├── navbar.tsx (dynamic auth-aware navigation)
│       ├── user-dropdown.tsx (profile dropdown)
│       └── rank-icon.tsx (geometric rank icons)
├── types/
│   └── sat-structure.ts (complete SAT hierarchy and helpers)
├── utils/
│   ├── rank-system.ts (rank calculation logic)
│   └── supabase/
│       ├── client.ts (browser)
│       ├── server.ts (SSR)
│       └── middleware.ts (route protection)
└── middleware.ts (Next.js middleware)
```

### **Dependencies Status**
- **Active**: @supabase/supabase-js, @supabase/ssr, Next.js 15, Tailwind CSS v4, zod (form validation)
- **Planned**: Material-UI (dashboard components), zustand (state management for quiz sessions)

### **Environment Variables**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Configured
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configured
- ✅ **OAuth providers configured in Supabase dashboard**:
  - Google OAuth: Client ID and Secret added
  - Facebook OAuth: App ID and Secret added

---

## Future Enhancement Ideas

### **User Experience**
- **Onboarding flow**: User preferences, difficulty level selection
- **Progress visualization**: Charts, badges, streaks
- **Adaptive learning**: Question difficulty based on performance
- **Mobile app**: React Native version

### **Features**
- **Practice modes**: Timed tests, topic-specific practice, full SAT simulation
- **Social features**: Leaderboards, study groups, peer comparisons
- **Analytics**: Detailed performance insights, weakness identification
- **Content**: Explanations, hints, study materials

---

## Troubleshooting Notes

### **Common Issues**
- **Font loading**: Ensure CSS variables are properly defined
- **Color inconsistency**: Use CSS custom properties, not hardcoded hex values
- **Route protection**: Public routes must be explicitly excluded in middleware
- **Supabase errors**: Check environment variables and client configuration

### **Development Workflow**
1. **Test locally**: Always verify functionality outside Claude Code
2. **Commit frequently**: Descriptive messages for feature tracking
3. **Update documentation**: Keep both CLAUDE.md and DEVELOPMENT_NOTES.md current
4. **Error handling**: Implement proper loading and error states
5. **OAuth testing**: Verify social login flows in development and production

---

*Certain parts generated with the help of Claude Code*