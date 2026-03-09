'use client';

import { useState, useEffect, useRef } from 'react';
import { searchTaxonomy } from '@/lib/ebird';
import type { TaxonomyEntry } from '@/lib/types';

export type Mode = 'biodiversity' | 'species' | 'notable';

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSpeciesSelect: (species: TaxonomyEntry) => void;
  selectedSpecies: TaxonomyEntry | null;
  resultCount: number | null;
  back: number;
  dist: number;
  onFilterChange: (back: number, dist: number) => void;
}

export default function ControlPanel({
  mode,
  onModeChange,
  onSpeciesSelect,
  selectedSpecies,
  resultCount,
  back,
  dist,
  onFilterChange,
}: Props) {
  // Local slider state for smooth display — committed to parent on release
  const [localBack, setLocalBack] = useState(back);
  const [localDist, setLocalDist] = useState(dist);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TaxonomyEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      searchTaxonomy(query)
        .then(setResults)
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(species: TaxonomyEntry) {
    onSpeciesSelect(species);
    setQuery('');
    setResults([]);
  }

  function commitFilters() {
    onFilterChange(localBack, localDist);
  }

  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white rounded p-3 w-72 z-10">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          className={`flex-1 py-1 rounded text-sm transition-colors ${
            mode === 'biodiversity'
              ? 'bg-white text-black font-medium'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={() => onModeChange('biodiversity')}
        >
          Biodiversity
        </button>
        <button
          className={`flex-1 py-1 rounded text-sm transition-colors ${
            mode === 'species'
              ? 'bg-white text-black font-medium'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={() => onModeChange('species')}
        >
          Species
        </button>
        <button
          className={`flex-1 py-1 rounded text-sm transition-colors ${
            mode === 'notable'
              ? 'bg-white text-black font-medium'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          onClick={() => onModeChange('notable')}
        >
          Notable
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-3">
        <div>
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>Radius</span>
            <span>{localDist} km</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            value={localDist}
            onChange={(e) => setLocalDist(Number(e.target.value))}
            onMouseUp={commitFilters}
            onTouchEnd={commitFilters}
            className="w-full accent-white cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>Lookback</span>
            <span>Last {localBack} day{localBack !== 1 ? 's' : ''}</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={localBack}
            onChange={(e) => setLocalBack(Number(e.target.value))}
            onMouseUp={commitFilters}
            onTouchEnd={commitFilters}
            className="w-full accent-white cursor-pointer"
          />
        </div>
      </div>

      {/* Species search — only shown in species mode */}
      {mode === 'species' && (
        <div className="relative">
          {selectedSpecies && (
            <div className="text-xs mb-2">
              <span className="text-white/60">Showing: </span>
              <span className="font-medium">{selectedSpecies.comName}</span>
              {resultCount !== null && (
                <span className="text-white/60"> · {resultCount} location{resultCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          <input
            type="text"
            placeholder="Search species…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/10 rounded px-3 py-1.5 text-sm placeholder-white/40 outline-none focus:bg-white/20"
          />
          {isSearching && (
            <div className="text-xs text-white/50 mt-1">Searching…</div>
          )}
          {results.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-gray-900 rounded border border-white/10 max-h-48 overflow-y-auto">
              {results.map((entry) => (
                <li
                  key={entry.speciesCode}
                  onClick={() => handleSelect(entry)}
                  className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer"
                >
                  <div>{entry.comName}</div>
                  <div className="text-xs text-white/50 italic">{entry.sciName}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
