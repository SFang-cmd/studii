'use client';

import { useState, useMemo } from 'react';
import { SubjectCard } from './subject-card';
import { DomainCard } from './domain-card';
import { SkillCard } from './skill-card';
import { DashboardFilter } from './dashboard-filter';
import { SAT_STRUCTURE, SATSubject, SATDomain, SATSkill } from '@/types/sat-structure';

interface FilterState {
  searchQuery: string;
  selectedSubjects: string[];
  selectedDomains: string[];
}

export function DashboardContent() {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedSubjects: [],
    selectedDomains: []
  });

  const filteredContent = useMemo(() => {
    const query = filters.searchQuery.toLowerCase();
    const hasFilters = 
      query || 
      filters.selectedSubjects.length > 0 || 
      filters.selectedDomains.length > 0;

    if (!hasFilters) {
      return SAT_STRUCTURE;
    }

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
      const filteredDomains = subject.domains.filter(domain => {
        const domainMatches = 
          !filters.selectedDomains.length || 
          filters.selectedDomains.includes(domain.id);
        
        const domainMatchesSearch = 
          !query || 
          domain.name.toLowerCase().includes(query) ||
          domain.description?.toLowerCase().includes(query);

        // Filter skills based on search only
        const filteredSkills = domain.skills.filter(skill => {
          const skillMatchesSearch = 
            !query || 
            skill.name.toLowerCase().includes(query) ||
            skill.description?.toLowerCase().includes(query);

          return skillMatchesSearch;
        });

        // Domain is included if it matches filters AND has matching skills
        const hasMatchingSkills = filteredSkills.length > 0;
        
        return domainMatches && domainMatchesSearch && hasMatchingSkills;
      }).map(domain => ({
        ...domain,
        skills: domain.skills.filter(skill => {
          const skillMatchesSearch = 
            !query || 
            skill.name.toLowerCase().includes(query) ||
            skill.description?.toLowerCase().includes(query);

          return skillMatchesSearch;
        })
      }));

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
    filters.selectedDomains.length > 0;

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
          {/* Subject Overview */}
          {filteredContent.length > 0 && !hasFilters && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {filteredContent.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject.name}
                  currentScore={subject.currentScore}
                  maxScore={subject.maxScore}
                  href={`/practice/${subject.id}`}
                />
              ))}
            </div>
          )}

          {/* Filtered Results or Detailed Content */}
          {filteredContent.map((subject) => (
            <div key={subject.id} className="mb-12">
              {hasFilters && (
                <div className="mb-6">
                  <SubjectCard
                    subject={subject.name}
                    currentScore={subject.currentScore}
                    maxScore={subject.maxScore}
                    href={`/practice/${subject.id}`}
                  />
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-paynes-gray">
                  {subject.name} Domains
                </h2>
                <div className="text-sm text-glaucous">
                  {subject.currentScore}/{subject.maxScore} points
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {subject.domains.map((domain) => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    subjectId={subject.id}
                    size="medium"
                  />
                ))}
              </div>

              {/* Skills breakdown for each domain */}
              {subject.domains.map((domain) => (
                <div key={domain.id} className="mb-8">
                  <h3 className="text-xl font-bold text-paynes-gray mb-4">
                    {domain.name} Skills
                    {hasFilters && (
                      <span className="text-sm font-normal text-glaucous ml-2">
                        ({domain.skills.length} skills)
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {domain.skills.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        subjectId={subject.id}
                        domainId={domain.id}
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