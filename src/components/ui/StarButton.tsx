import React from 'react';

interface StarButtonProps {
  starred: boolean;
  onToggle: () => void;
  className?: string;
}

export const StarButton: React.FC<StarButtonProps> = ({ starred, onToggle, className }) => {
  return (
    <button
      aria-label={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`p-2 rounded-md transition-colors ${className || ''} ${
        starred ? 'text-yellow-400' : 'text-white/40 hover:text-white/80'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </button>
  );
};
