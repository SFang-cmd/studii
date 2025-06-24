'use client';

import { useState } from 'react';
import { SAT_STRUCTURE } from '@/types/sat-structure';

interface FilterState {
  searchQuery: string;
  selectedSubjects: string[];
  selectedDomains: string[];
}

interface DashboardFilterProps {
  onFilterChange: (filters: FilterState) => void;
}

export function DashboardFilter({ onFilterChange }: DashboardFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedSubjects: [],
    selectedDomains: []
  });

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleSearchChange = (query: string) => {
    updateFilters({ searchQuery: query });
  };

  const toggleSubject = (subjectId: string) => {
    const newSelected = filters.selectedSubjects.includes(subjectId)
      ? filters.selectedSubjects.filter(id => id !== subjectId)
      : [...filters.selectedSubjects, subjectId];
    updateFilters({ selectedSubjects: newSelected });
  };

  const toggleDomain = (domainId: string) => {
    const newSelected = filters.selectedDomains.includes(domainId)
      ? filters.selectedDomains.filter(id => id !== domainId)
      : [...filters.selectedDomains, domainId];
    updateFilters({ selectedDomains: newSelected });
  };

  const clearFilters = () => {
    updateFilters({
      searchQuery: '',
      selectedSubjects: [],
      selectedDomains: []
    });
  };

  const hasActiveFilters = 
    filters.searchQuery || 
    filters.selectedSubjects.length > 0 || 
    filters.selectedDomains.length > 0;

  return (
    <div className="bg-glaucous rounded-2xl p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search topics, domains, or skills..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-bittersweet focus:border-transparent"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Filters */}
          {SAT_STRUCTURE.map((subject) => (
            <button
              key={subject.id}
              onClick={() => toggleSubject(subject.id)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                filters.selectedSubjects.includes(subject.id)
                  ? 'bg-bittersweet text-white'
                  : 'bg-white text-glaucous hover:bg-gray-100'
              }`}
            >
              {subject.name}
            </button>
          ))}

          {/* Domain Filters - Simplified */}
          <div className="relative group">
            <button className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-white text-glaucous hover:bg-gray-100 flex items-center gap-1">
              Domains
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
              {filters.selectedDomains.length > 0 && (
                <span className="bg-bittersweet text-white rounded-full w-4 h-4 text-xs flex items-center justify-center ml-1">
                  {filters.selectedDomains.length}
                </span>
              )}
            </button>
            
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="space-y-3">
                {SAT_STRUCTURE.map((subject) => (
                  <div key={subject.id}>
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">{subject.name}</h4>
                    <div className="flex flex-wrap gap-1">
                      {subject.domains.map((domain) => (
                        <button
                          key={domain.id}
                          onClick={() => toggleDomain(domain.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            filters.selectedDomains.includes(domain.id)
                              ? 'bg-bittersweet text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {domain.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-lg font-medium transition-colors text-sm bg-white text-red-600 hover:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}