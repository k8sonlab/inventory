// Excel stores dates as days since 1900-01-01 and JavaScript as milliseconds since 1970-01-01
export function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;
  const days = Number(excelDate);
  if (isNaN(days)) return null;
  return new Date((days - 25569) * 86400 * 1000);
}

// Accepts an Excel serial number (as a number or digit string), an ISO date string or a Date
function toDate(value) {
  if (typeof value === 'string') {
    return /^\d+$/.test(value) ? excelDateToJSDate(value) : new Date(value);
  }
  if (typeof value === 'number') return excelDateToJSDate(value);
  return value;
}

export function formatExpirationDate(value) {
  if (!value) return '-';
  const date = toDate(value);
  if (!date || isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// 'expired', 'expiring-soon' (within three months) or '' for styling the expiration cell
export function getExpirationStatusClass(value) {
  if (!value) return '';
  const date = toDate(value);
  if (!date || isNaN(date.getTime())) return '';
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  if (date < new Date()) return 'expired';
  if (date < threeMonthsFromNow) return 'expiring-soon';
  return '';
}
