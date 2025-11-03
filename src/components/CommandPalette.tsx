"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CommandItem {
  label: string;
  href: string;
  shortcut?: string;
}

const DEFAULT_ITEMS: CommandItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Browse Tokens', href: '/browse' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Launch Token', href: '/token/new' },
  { label: 'Create Escrow', href: '/escrow/new' },
  { label: 'Docs', href: '/docs' },
];

export function CommandPalette({
  items = DEFAULT_ITEMS,
}: { items?: CommandItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tokenResults, setTokenResults] = useState<{ name: string; symbol: string; address: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setOpen((v) => !v);
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
    const tokens = tokenResults.map((t) => ({ label: `${t.symbol} • ${t.name}`, href: `/token/${t.address}` }));
    return [...tokens, ...base];
  }, [items, query, tokenResults]);

  const searchTokens = useDebouncedCallback(async (q: string) => {
    if (!q) { setTokenResults([]); return; }
    try {
      setLoading(true);
      const res = await fetch(`/api/tokens?limit=5&search=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json?.data?.tokens) {
        setTokenResults(json.data.tokens.map((t: any) => ({ name: t.name, symbol: t.symbol, address: t.address })));
      }
    } finally {
      setLoading(false);
    }
  }, 200);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl mx-auto">
        <div className="bg-surface2 border border-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); searchTokens(e.target.value); }}
              placeholder="Search commands... (Cmd/Ctrl+K)"
              className="w-full bg-transparent outline-none text-text-primary placeholder-text-muted"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') {
                  e.preventDefault();
                  const item = results[selectedIndex];
                  if (item) {
                    setOpen(false);
                    router.push(item.href);
                  }
                }
              }}
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {loading && (
              <div className="p-3 text-xs text-text-muted">Searching...</div>
            )}
            {results.length === 0 && !loading ? (
              <div className="p-4 text-text-muted">No results</div>
            ) : (
              results.map((item, idx) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 transition-colors border-t border-border ${idx === selectedIndex ? 'bg-surface3' : 'hover:bg-surface3'}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="text-text-primary">{item.label}</span>
                  {/* Optional shortcut label if provided in default items */}
                  {'shortcut' in item && (item as any).shortcut ? (
                    <span className="text-xs text-text-muted">{(item as any).shortcut}</span>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
