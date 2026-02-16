"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface SymbolAutocompleteProps {
  defaultValue?: string;
  placeholder?: string;
  onSelect?: (symbol: string, name: string) => void;
}

export function SymbolAutocomplete({
  defaultValue = "",
  placeholder,
  onSelect,
}: SymbolAutocompleteProps) {
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const selectItem = (item: SearchResult) => {
    setValue(item.symbol);
    setIsOpen(false);
    setResults([]);
    onSelect?.(item.symbol, item.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectItem(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id="symbol"
        name="symbol"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        required
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border-2 border-input bg-background shadow-lg overflow-hidden">
          {results.map((item, index) => (
            <li
              key={item.symbol}
              className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                index === activeIndex
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground hover:bg-muted/50"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate">{item.symbol}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {item.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {item.exchange}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
