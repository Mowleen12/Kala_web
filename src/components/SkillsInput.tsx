import React, { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { suggestSkills } from '../lib/skills';

interface SkillsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Cap so one profile cannot turn into a keyword dump. */
  maxSkills?: number;
  invalid?: boolean;
}

/**
 * Chip-based skills picker with a curated typeahead.
 *
 * Typing filters `SKILL_SUGGESTIONS`; Enter (or click, or comma) commits the
 * highlighted suggestion, or the raw text when nothing matches, so an artist
 * with an unusual discipline is never blocked by the list.
 */
export const SkillsInput: React.FC<SkillsInputProps> = ({
  value,
  onChange,
  id,
  label,
  placeholder = 'Start typing a skill — e.g. Kathak',
  ariaLabel = 'Skills',
  maxSkills = 15,
  invalid = false,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id || 'skills'}-suggestions`;

  const suggestions = useMemo(() => suggestSkills(query, value, 8), [query, value]);
  const atCap = value.length >= maxSkills;

  const add = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setQuery('');
      return;
    }
    if (atCap) return;
    onChange([...value, skill]);
    setQuery('');
    setHighlight(0);
    setOpen(true);
  };

  const remove = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(open && suggestions[highlight] ? suggestions[highlight] : query);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-zinc-700 mb-1">
          {label}
        </label>
      )}

      {/* Chip well doubles as the click target for the input */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 w-full bg-[#FAF8F5] border rounded-xl px-2.5 py-2 transition-all cursor-text ${
          invalid ? 'border-red-400' : 'border-[#E5E0D6] focus-within:border-[#E45826] focus-within:bg-white'
        }`}
      >
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-white border border-[#EDE7DE] text-xs font-semibold text-zinc-700"
          >
            {skill}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(skill);
              }}
              aria-label={`Remove ${skill}`}
              className="w-4 h-4 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="relative flex-1 min-w-[8rem]">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={ariaLabel}
            disabled={atCap}
            value={query}
            placeholder={atCap ? `Maximum ${maxSkills} skills` : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 outline-none py-1 disabled:cursor-not-allowed placeholder:text-zinc-400"
          />
        </div>
      </div>

      {atCap && (
        <p className="text-[11px] text-zinc-400 mt-1">
          {maxSkills} skills is the limit — remove one to add another.
        </p>
      )}

      {/* Suggestion list */}
      {open && suggestions.length > 0 && !atCap && (
        <ul
          id={listId}
          role="listbox"
          className="relative z-20 mt-1 max-h-52 overflow-auto bg-white border border-[#E5E0D6] rounded-xl shadow-lg py-1"
        >
          {suggestions.map((skill, i) => (
            <li key={skill} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                // mousedown is prevented so the input keeps focus and blur
                // doesn't close the list before this click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(skill)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                  i === highlight
                    ? 'bg-[#FDEEE7] text-[#E45826] font-semibold'
                    : 'text-zinc-700 hover:bg-[#FAF8F5]'
                }`}
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="truncate">{skill}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Free-text fallback: the curated list is not exhaustive */}
      {open && query.trim() && suggestions.length === 0 && !atCap && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => add(query)}
          className="mt-1 w-full text-left px-3 py-1.5 rounded-xl border border-dashed border-[#E0D9CD] text-xs text-zinc-600 hover:border-[#E45826] hover:text-[#E45826] transition-colors cursor-pointer"
        >
          Add “{query.trim()}” as a custom skill
        </button>
      )}
    </div>
  );
};
