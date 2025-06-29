'use client';

import { useState, useMemo } from 'react';
import { SubjectCard } from './subject-card';
import { DomainCard } from './domain-card';
import { SkillCard } from './skill-card';
import { DashboardFilter } from './dashboard-filter';
import { UserProgress } from '@/types/user-progress';
import { calculateSubjectScore } from '@/utils/score-calculations';
import { SAT_STRUCTURE, SATSubject, getSubjectById } from '@/types/sat-structure';

interface FilterState {
  searchQuery: string;
  selectedSubjects: string[];
  selectedDomains: string[];
  selectedSkills: string[];
}

interface DashboardContentProps {
  userProgress: UserProgress;
}

export function DashboardContent({ userProgress }: DashboardContentProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedSubjects: [],
    selectedDomains: [],
    selectedSkills: []
  });

  const filteredContent = useMemo(() => {
    const query = filters.searchQuery.toLowerCase();
    const hasFilters = 
      query || 
      filters.selectedSubjects.length > 0 || 
      filters.selectedDomains.length > 0 ||
      filters.selectedSkills.length > 0;

    if (!hasFilters) {
      return SAT_STRUCTURE;
    }
    
    // If skills are selected, we need to filter down to only those skills and their parent domains/subjects
    if (filters.selectedSkills.length > 0) {
      // First, find all domains that contain the selected skills
      const relevantDomainIds = new Set<string>();
      const relevantSubjectIds = new Set<string>();
      
      // Find all domains containing selected skills and their parent subjects
      SAT_STRUCTURE.forEach(subject => {
        subject.domains.forEach(domain => {
          const hasSelectedSkill = domain.skills.some(skill => 
            filters.selectedSkills.includes(skill.id)
          );
          
          if (hasSelectedSkill) {
            relevantDomainIds.add(domain.id);
            relevantSubjectIds.add(subject.id);
          }
        });
      });
      
      // Now filter the structure to only include relevant subjects, domains, and selected skills
      return SAT_STRUCTURE
        .filter(subject => relevantSubjectIds.has(subject.id))
        .map(subject => {
          // Get the original subject for score calculations
          const originalSubject = getSubjectById(subject.id)!;
          
          // Only include domains that contain selected skills
          const filteredDomains = subject.domains
            .filter(domain => relevantDomainIds.has(domain.id))
            .map(domain => {
              // Find the original domain for score calculations
              const originalDomain = originalSubject.domains.find(d => d.id === domain.id)!;
              
              // Only include the selected skills within each domain for display
              // but preserve the original domain data for score calculations
              return {
                ...originalDomain, // Keep all original domain data for score calculations
                // Only show the filtered skills in the UI
                displaySkills: domain.skills.filter(skill => 
                  filters.selectedSkills.includes(skill.id)
                )
              };
            });
            
          return {
            ...originalSubject, // Keep all original subject data for score calculations
            domains: filteredDomains
          };
        });
    }
    
    // Handle other filter types (subjects, domains, search query)
    return SAT_STRUCTURE.map(subject => {
      // Check if subject matches filters
      const subjectMatches = 
        !filters.selectedSubjects.length || 
        filters.selectedSubjects.includes(subject.id);
      
      const subjectMatchesSearch = 
        !query || 
        subject.name.toLowerCase().includes(query) ||
        subject.description?.toLowerCase().includes(query);

      // Filter domains
      const filteredDomains = subject.domains.map(domain => {
        // Filter skills within the domain
        const filteredSkills = domain.skills.filter(skill => {
          // Check if skill matches search query
          const skillMatchesSearch = 
            !query || 
            skill.name.toLowerCase().includes(query) ||
            skill.description?.toLowerCase().includes(query);
            
          return skillMatchesSearch;
        });
        
        // Return domain with filtered skills
        return {
          ...domain,
          skills: filteredSkills
        };
      }).filter(domain => {
        const domainMatches = 
          !filters.selectedDomains.length || 
          filters.selectedDomains.includes(domain.id);
        
        const domainMatchesSearch = 
          !query || 
          domain.name.toLowerCase().includes(query) ||
          domain.description?.toLowerCase().includes(query);

        // Domain is included if it matches filters AND has matching skills
        const hasMatchingSkills = domain.skills.length > 0;
        
        return domainMatches && domainMatchesSearch && hasMatchingSkills;
      });

      // Subject is included if it matches AND has matching domains
      const hasMatchingDomains = filteredDomains.length > 0;
      
      if (subjectMatches && subjectMatchesSearch && hasMatchingDomains) {
        return {
          ...subject,
          domains: filteredDomains
        };
      }

      return null;
    }).filter(Boolean) as SATSubject[];
  }, [filters]);

  const hasResults = filteredContent.length > 0;
  const hasFilters = 
    filters.searchQuery || 
    filters.selectedSubjects.length > 0 || 
    filters.selectedDomains.length > 0 ||
    filters.selectedSkills.length > 0;

  return (
    <>
      <DashboardFilter onFilterChange={setFilters} />

      {!hasResults && hasFilters && (
        <div className="text-center py-12">
          <div className="text-glaucous text-lg mb-2">No results found</div>
          <div className="text-gray-500">
            Try adjusting your filters or search terms
          </div>
        </div>
      )}

      {hasResults && (
        <>
          {/* Subject Overview - Always visible when no filters */}
          {!hasFilters && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {filteredContent.map((subject) => (
                  <div key={subject.id} className="space-y-6">
                    {/* Subject Card */}
                    <SubjectCard
                      subject={subject}
                      currentScore={calculateSubjectScore(getSubjectById(subject.id)!, userProgress)}
                      maxScore={subject.maxScore}
                      href={`/practice/${subject.id}`}
                    />
                    
                    {/* Domains directly under each subject */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-paynes-gray">
                          {subject.name} Domains
                        </h2>
                        <div className="text-sm text-glaucous">
                          {calculateSubjectScore(getSubjectById(subject.id)!, userProgress)}/{subject.maxScore} points
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {subject.domains.map((domain) => (
                          <DomainCard
                            key={domain.id}
                            domain={domain}
                            subjectId={subject.id}
                            userProgress={userProgress}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All Skills at the bottom */}
              <div className="space-y-12">
                {filteredContent.map((subject) => (
                  <div key={subject.id}>
                    <h2 className="text-3xl font-bold text-paynes-gray mb-8">
                      {subject.name} Skills
                    </h2>
                    
                    {subject.domains.map((domain) => (
                      <div key={domain.id} className="mb-8">
                        <h3 className="text-xl font-bold text-paynes-gray mb-4">
                          {domain.name}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(domain.displaySkills || domain.skills).map((skill) => (
                            <SkillCard
                              key={skill.id}
                              skill={skill}
                              subjectId={subject.id}
                              domainId={domain.id}
                              userProgress={userProgress}
                              size="small"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Filtered Results - Show expanded view when filters are active */}
          {hasFilters && filteredContent.map((subject) => (
            <div key={subject.id} className="mb-12">
              <div className="mb-6">
                <SubjectCard
                  subject={subject}
                  currentScore={calculateSubjectScore(getSubjectById(subject.id)!, userProgress)}
                  maxScore={subject.maxScore}
                  href={`/practice/${subject.id}`}
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-paynes-gray">
                  {subject.name} Domains
                </h2>
                <div className="text-sm text-glaucous">
                  {calculateSubjectScore(getSubjectById(subject.id)!, userProgress)}/{subject.maxScore} points
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {subject.domains.map((domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    subjectId={subject.id}
                    userProgress={userProgress}
                    size="medium"
                  />
                ))}
              </div>

              {/* Skills breakdown for each domain */}
              {subject.domains.map((domain) => (
                <div key={domain.id} className="mb-8">
                  <h3 className="text-xl font-bold text-paynes-gray mb-4">
                    {domain.name} Skills
                    <span className="text-sm font-normal text-glaucous ml-2">
                      ({(domain.displaySkills || domain.skills).length} skills)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(domain.displaySkills || domain.skills).map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        subjectId={subject.id}
                        domainId={domain.id}
                        userProgress={userProgress}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </>
  );
}