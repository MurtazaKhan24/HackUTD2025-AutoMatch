import React, { useState, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import featuresData from "../data/features.json";

export type FeatureTag = {
  id: string;
  label: string;
  custom?: boolean;
};

interface FeatureTagInputProps {
  value: FeatureTag[];
  onChange: (next: FeatureTag[]) => void;
  maxTags?: number;
  placeholder?: string;
}

const fuse = new Fuse(featuresData, {
  keys: ["label", "syn"],
  threshold: 0.35,
  minMatchCharLength: 2,
});

export const FeatureTagInput: React.FC<FeatureTagInputProps> = ({
  value,
  onChange,
  maxTags = 12,
  placeholder = "Add car features...",
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.length >= 2) {
      const results = fuse.search(input, { limit: 8 });
      setSuggestions(results.map(r => r.item));
    } else {
      setSuggestions(featuresData.slice(0, 8));
    }
  }, [input]);

  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      dropdownRef.current.scrollTop = highlight * 40;
    }
  }, [highlight, showDropdown]);

  const addTag = (tag: FeatureTag) => {
    if (value.find(t => t.id === tag.id)) return;
    if (value.length >= maxTags) return;
    onChange([...value, tag]);
    setInput("");
    setShowDropdown(false);
    setHighlight(-1);
  };

  const removeTag = (id: string) => {
    onChange(value.filter(t => t.id !== id));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setShowDropdown(true);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlight(h => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (highlight >= 0 && suggestions[highlight]) {
        addTag(suggestions[highlight]);
      } else if (input.trim()) {
        addTag({ id: `custom:${input.trim()}`, label: input.trim(), custom: true });
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlight(-1);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => setShowDropdown(false), 100);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 items-center mb-2">
        {value.map(tag => (
          <span key={tag.id} className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm mr-1 mb-1">
            {tag.label}
            <button
              type="button"
              aria-label={`Remove ${tag.label}`}
              className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
              onClick={() => removeTag(tag.id)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length >= maxTags ? `Max ${maxTags} features` : placeholder}
          disabled={value.length >= maxTags}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          className={`flex-1 min-w-[120px] border-none outline-none bg-transparent text-base ${value.length >= maxTags ? 'text-gray-400' : ''}`}
        />
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute z-10 bg-white border border-gray-200 rounded shadow w-full max-w-lg mt-1"
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              role="option"
              aria-selected={highlight === i}
              tabIndex={-1}
              className={`px-4 py-2 cursor-pointer ${highlight === i ? 'bg-blue-100' : ''}`}
              onMouseDown={() => addTag(s)}
              onMouseEnter={() => setHighlight(i)}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
      {value.length >= maxTags && (
        <div className="text-xs text-gray-400 mt-1">Max {maxTags} features reached</div>
      )}
    </div>
  );
};
