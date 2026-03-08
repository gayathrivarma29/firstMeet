/**
 * deadlineParser.js
 * Converts freeform deadline strings ("Friday", "This week", "Today", etc.)
 * into Date objects so overdue math is possible.
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const parseDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;

    const lower = deadlineStr.toLowerCase().trim();

    if (lower === 'not specified' || lower === 'n/a' || lower === '') return null;

    const now = new Date();
    now.setHours(23, 59, 59, 999); // end of today

    // "today"
    if (lower === 'today') return now;

    // "tomorrow"
    if (lower === 'tomorrow') {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        return d;
    }

    // "this week" → end of current Sunday
    if (lower === 'this week') {
        const d = new Date(now);
        const daysUntilSunday = 7 - d.getDay();
        d.setDate(d.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday));
        return d;
    }

    // "next week" → end of next Sunday
    if (lower === 'next week') {
        const d = new Date(now);
        const daysUntilSunday = 7 - d.getDay();
        d.setDate(d.getDate() + daysUntilSunday + 7);
        return d;
    }

    // "this month" → last day of current month
    if (lower === 'this month') {
        const d = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return d;
    }

    // Day names: "Monday", "Friday", etc. → next occurrence
    const dayIndex = DAY_NAMES.indexOf(lower);
    if (dayIndex !== -1) {
        const d = new Date(now);
        const currentDay = d.getDay();
        let daysAhead = dayIndex - currentDay;
        if (daysAhead <= 0) daysAhead += 7;
        d.setDate(d.getDate() + daysAhead);
        return d;
    }

    // "end of [month name]" → last day of that month
    const endOfMonthMatch = lower.match(/end of (\w+)/);
    if (endOfMonthMatch) {
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const mIdx = months.indexOf(endOfMonthMatch[1]);
        if (mIdx !== -1) {
            const year = mIdx >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
            return new Date(year, mIdx + 1, 0, 23, 59, 59);
        }
    }

    // "in X days"
    const inDaysMatch = lower.match(/in (\d+) days?/);
    if (inDaysMatch) {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
        return d;
    }

    // Try native Date parse as last resort (handles "2025-08-15", "Aug 15", etc.)
    const nativeParsed = new Date(deadlineStr);
    if (!isNaN(nativeParsed.getTime())) return nativeParsed;

    return null;
};

module.exports = { parseDeadline };
