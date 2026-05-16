import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const MX_TZ = 'America/Mexico_City';

/**
 * Returns the current timestamp in strictly ISO UTC format (Z).
 * Useful for timestamps generated at "now" to be sent to the backend.
 */
export const nowISO = (): string => {
    return dayjs().utc().format();
};

/**
 * Returns the current date and time formatted for Mexico City (visualizing).
 */
export const todayMX = (formatStr: string = 'DD/MM/YYYY, h:mm A'): string => {
    return dayjs().tz(MX_TZ).format(formatStr);
};

/**
 * Returns the current date in YYYY-MM-DD format based on Mexico City timezone.
 * Useful for setting default date values in input fields.
 */
export const todayDateInputMX = (): string => {
    return dayjs().tz(MX_TZ).format('YYYY-MM-DD');
};

/**
 * Formats any ISO date parameter to Mexico City timezone.
 */
export const formatDateMX = (isoString: string | Date | null | undefined, formatStr: string = 'DD/MM/YYYY, h:mm A'): string => {
    if (!isoString) return '';
    return dayjs(isoString).tz(MX_TZ).format(formatStr);
};

/**
 * Formats a date-only value (stored as UTC midnight, e.g. '2026-04-17 00:00:00.000' or '2026-04-17T00:00:00.000Z')
 * without shifting the day due to timezone conversion.
 * Parses the value strictly as UTC so that 00:00:00Z stays on the correct calendar day.
 */
export const formatDateOnlyMX = (isoString: string | Date | null | undefined, formatStr: string = 'DD/MM/YYYY'): string => {
    if (!isoString) return '';
    return dayjs.utc(isoString).format(formatStr);
};

/**
 * Converts an input date value (YYYY-MM-DD) to a strict UTC ISO 8601 string.
 * Example: '2025-10-15' -> '2025-10-15T00:00:00.000Z'
 */
export const startOfDayUTC = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(`${dateString}T00:00:00.000Z`).toISOString();
};

/**
 * Takes an input date (YYYY-MM-DD) and forces it strictly to UTC End Of Day.
 * Example: '2025-10-15' -> '2025-10-15T23:59:59.999Z'
 */
export const endOfDayUTC = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(`${dateString}T23:59:59.999Z`).toISOString();
};

/**
 * Parses an ISO string securely, optionally mapping to MX to format back to input value (YYYY-MM-DD).
 */
export const isoToDateInputMX = (isoString: string | Date | null | undefined): string => {
    if (!isoString) return '';
    return dayjs(isoString).tz(MX_TZ).format('YYYY-MM-DD');
};

/**
 * Converts a UTC-midnight ISO string (e.g. estimated_delivery_date) to a YYYY-MM-DD input value
 * WITHOUT applying any timezone offset, so the calendar day is preserved exactly.
 * Use this for date-only fields that are stored as UTC midnight.
 * Example: '2026-04-22T00:00:00.000Z' → '2026-04-22' (not '2026-04-21' with UTC-6).
 */
export const isoToDateInputUTC = (isoString: string | Date | null | undefined): string => {
    if (!isoString) return '';
    return dayjs.utc(isoString).format('YYYY-MM-DD');
};

/**
 * Converts a UTC ISO string to a "YYYY-MM-DDTHH:mm" local string
 * suitable for <input type="datetime-local"> in MX timezone.
 * Example: '2026-04-23T20:10:00Z' → '2026-04-23T14:10' (UTC-6)
 */
export const isoToDatetimeLocalMX = (isoString: string | Date | null | undefined): string => {
  if (!isoString) return '';
  return dayjs(isoString).tz(MX_TZ).format('YYYY-MM-DDTHH:mm');
};

/**
 * Returns the current local time as "YYYY-MM-DDTHH:mm" in MX timezone.
 * Use this as the default value for <input type="datetime-local">.
 */
export const nowDatetimeLocalMX = (): string => {
  return dayjs().tz(MX_TZ).format('YYYY-MM-DDTHH:mm');
};

/**
 * To ensure absolute UTC Z format strictly.
 */
export const toUTCISO = (dateString: string): string => {
     if (!dateString) return '';
     return dayjs(dateString).utc().format();
}

/**
 * Keeps the precise execution time if the user is keeping the date today (or the original timestamp if editing).
 * Otherwise gracefully fallback to startOfDayUTC matching the calendar choice.
 */
export const preserveTimeOrStartOfDay = (newDateInput: string, originalISO?: string | null): string => {
    if (!newDateInput) return '';
    
    // Si estamos editando y el input date YYYY-MM-DD coincide exactamente con el YYYY-MM-DD del original
    // Preservamos la hora original del registro.
    if (originalISO) {
        const originalInput = isoToDateInputMX(originalISO);
        if (newDateInput === originalInput) {
            return originalISO;
        }
    }
    
    // Si el usuario seleccionó la fecha de HOY en el calendario (o es el default)
    // Preservamos la hora actual exacta
    if (newDateInput === todayDateInputMX()) {
        return nowISO();
    }
    
    // Si escogieron un día manual distinto al hoy (histórico o futuro sin edición), asignamos la hora 00:00:00Z UTC.
    return startOfDayUTC(newDateInput);
};
