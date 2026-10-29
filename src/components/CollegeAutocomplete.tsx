import { useState } from 'react';
import { DELHI_COLLEGES } from '../lib/colleges';

interface CollegeAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  maxLength?: number;
}

export const CollegeAutocomplete = ({
  id,
  value,
  onChange,
  placeholder,
  className = '',
  wrapperClassName = '',
  ariaLabel,
  ariaInvalid,
  maxLength,
}: CollegeAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = value.trim().toLowerCase();
  const matches = q ? DELHI_COLLEGES.filter((c) => c.toLowerCase().includes(q)) : DELHI_COLLEGES;

  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className={wrapperClassName}>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        aria-expanded={open}
        aria-controls="kala-college-listbox"
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && open && active >= 0) {
            e.preventDefault();
            if (active === matches.length) {
              setOpen(false);
              setActive(-1);
            } else {
              pick(matches[active]);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={className}
      />
      {open && (
        <ul
          id="kala-college-listbox"
          role="listbox"
          className="mt-1.5 max-h-44 overflow-y-auto bg-white border border-[#E5E0D6] rounded-xl shadow-xs py-1"
        >
          {matches.map((c, i) => (
            <li
              key={c}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                i === active ? 'bg-[#FDEEE7] text-[#E45826]' : 'text-zinc-700 hover:bg-[#FAF8F5]'
              }`}
            >
              {c}
            </li>
          ))}
          <li
            role="option"
            aria-selected={active === matches.length}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            }}
            onMouseEnter={() => setActive(matches.length)}
            className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors border-t border-[#E5E0D6] ${
              active === matches.length
                ? 'bg-[#FDEEE7] text-[#E45826]'
                : 'text-[#E45826] hover:bg-[#FAF8F5]'
            }`}
          >
            Not in the list? Type it yourself
          </li>
        </ul>
      )}
    </div>
  );
};
