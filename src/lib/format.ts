/**
 * Utility functions for formatting values
 */

/**
 * Format token amounts with proper decimal places
 * @param amount - The amount as a string or number
 * @param decimals - Number of decimal places (default 18)
 * @returns Formatted string
 */
export function formatTokenAmount(amount: string | number, decimals: number = 18): string {
  try {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(value)) {
      return '0';
    }
    
    // For large numbers, use compact notation
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(2) + 'B';
    } else if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(2) + 'M';
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(2) + 'K';
    }
    
    // For small numbers, show appropriate decimal places
    if (value < 0.01) {
      return value.toFixed(6);
    } else if (value < 1) {
      return value.toFixed(4);
    } else if (value < 100) {
      return value.toFixed(2);
    }
    
    return value.toLocaleString();
  } catch (err) {
    console.error('Error formatting token amount:', err);
    return '0';
  }
}

/**
 * Calculate escrow progress percentage
 * @param releasedAmount - Amount already released
 * @param totalAmount - Total escrow amount
 * @returns Progress percentage (0-100)
 */
export function calculateEscrowProgress(releasedAmount: string | number, totalAmount: string | number): number {
  try {
    const released = typeof releasedAmount === 'string' ? parseFloat(releasedAmount) : releasedAmount;
    const total = typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount;
    
    if (isNaN(released) || isNaN(total) || total === 0) {
      return 0;
    }
    
    return Math.min(100, Math.round((released / total) * 100));
  } catch (err) {
    console.error('Error calculating escrow progress:', err);
    return 0;
  }
}

/**
 * Format USD value
 * @param value - The value to format
 * @returns Formatted USD string
 */
export function formatUSD(value: string | number): string {
  try {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(amount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (err) {
    console.error('Error formatting USD:', err);
    return '$0.00';
  }
}

/**
 * Format percentage
 * @param value - The percentage value
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  try {
    if (isNaN(value)) {
      return '0%';
    }
    
    return `${value.toFixed(2)}%`;
  } catch (err) {
    console.error('Error formatting percentage:', err);
    return '0%';
  }
}

/**
 * Shorten wallet address
 * @param address - The wallet address
 * @param chars - Number of characters to show on each side
 * @returns Shortened address
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format time ago
 * @param timestamp - The timestamp to format
 * @returns Human-readable time ago string
 */
export function formatTimeAgo(timestamp: string | number | Date): string {
  try {
    const date = typeof timestamp === 'string' || typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : timestamp;
    
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'just now';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (seconds < 604800) {
      const days = Math.floor(seconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (err) {
    console.error('Error formatting time ago:', err);
    return '';
  }
}