export type DatePresetKey = 'TODAY' | 'YESTERDAY' | 'LAST_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export interface DateRange {
  preset: DatePresetKey;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRangeForPreset(preset: DatePresetKey): { startDate: string; endDate: string } {
  const now = new Date();

  switch (preset) {
    case 'TODAY': {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = formatDate(yesterday);
      return { startDate: yStr, endDate: yStr };
    }
    case 'LAST_WEEK': {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return {
        startDate: formatDate(sevenDaysAgo),
        endDate: formatDate(now),
      };
    }
    case 'THIS_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(now),
      };
    }
    case 'CUSTOM':
    default: {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return {
        startDate: formatDate(thirtyDaysAgo),
        endDate: formatDate(now),
      };
    }
  }
}
