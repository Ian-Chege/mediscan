/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a timestamp to a readable date+time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Parse a time string like "08:00" into hours and minutes
 */
export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/**
 * Format hours and minutes into a display string like "8:00 AM"
 */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Get a severity color for drug interactions.
 * Optionally accepts a colors object with themed severity tokens.
 */
export function getSeverityColor(
  severity: string,
  colors?: { severityHigh: string; severityModerate: string; severityLow: string; severityDefault: string },
): string {
  const high = colors?.severityHigh ?? '#FF6B6B';
  const moderate = colors?.severityModerate ?? '#FFB347';
  const low = colors?.severityLow ?? '#6BCB77';
  const fallback = colors?.severityDefault ?? '#6B7280';

  switch (severity) {
    case 'high':
      return high;
    case 'moderate':
      return moderate;
    case 'low':
      return low;
    default:
      return fallback;
  }
}

/**
 * Truncate text to a max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
