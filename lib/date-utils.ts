import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns';

export function parseSafeDate(dateValue: any): Date | null {
  if (dateValue === null || dateValue === undefined) return null;

  try {
    // 1. If it has a toDate function (like Firestore Timestamp)
    if (typeof dateValue.toDate === 'function') {
      const d = dateValue.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d;
      }
    }

    // 2. If it's a serialized Firestore Timestamp object (e.g. from JSON state or logs)
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      const d = new Date(dateValue.seconds * 1000);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }

    // 3. If it's already a Date
    if (dateValue instanceof Date) {
      if (!isNaN(dateValue.getTime())) {
        return dateValue;
      }
    }

    // 4. If it's a number or string
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      if (typeof dateValue === 'string' && dateValue.trim() === '') {
        return null;
      }
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  } catch (err) {
    console.warn("parseSafeDate error:", err);
  }

  return null;
}

export function safeFormat(dateValue: any, formatStr: string, fallback = 'N/A'): string {
  const parsed = parseSafeDate(dateValue);
  if (!parsed) return fallback;
  try {
    return dateFnsFormat(parsed, formatStr);
  } catch (err) {
    console.warn("safeFormat formatting error:", err);
    return fallback;
  }
}

export function safeFormatDistanceToNow(dateValue: any, options?: any, fallback = 'recently'): string {
  const parsed = parseSafeDate(dateValue);
  if (!parsed) return fallback;
  try {
    return dateFnsFormatDistanceToNow(parsed, options);
  } catch (err) {
    console.warn("safeFormatDistanceToNow error:", err);
    return fallback;
  }
}
