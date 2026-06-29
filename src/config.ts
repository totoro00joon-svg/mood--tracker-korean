export type MoodConfig = {
  label: string;
  emoji: string;
  color: string;
};

export type PeriodConfig = {
  id: string;
  label: string;
  emoji: string;
  time: string;
  hour: number;
  minute: number;
};

export type AppConfig = {
  moods: MoodConfig[];
  periods: PeriodConfig[];
  noticeText: string;
};

export const DEFAULT_CONFIG: AppConfig = {
  moods: [
    { label: '좋음', emoji: '😊', color: '#52796f' },
    { label: '보통', emoji: '😐', color: '#7a8fa6' },
    { label: '불안', emoji: '😰', color: '#9b7fa6' },
    { label: '우울', emoji: '😢', color: '#516b8c' },
    { label: '짜증', emoji: '😠', color: '#b85c5c' },
    { label: '피곤', emoji: '😴', color: '#8a7660' },
    { label: '평온', emoji: '😌', color: '#4a8c6f' },
  ],
  periods: [
    { id: 'morning', label: '아침', emoji: '🌅', time: '08:00', hour: 8,  minute: 0 },
    { id: 'lunch',   label: '점심', emoji: '☀️', time: '12:00', hour: 12, minute: 0 },
    { id: 'evening', label: '저녁', emoji: '🌙', time: '20:00', hour: 20, minute: 0 },
  ],
  noticeText: '지금 기분을 기록할 시간입니다.',
};

const CONFIG_KEY = 'mood-checkin.config';

export const readConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return DEFAULT_CONFIG;
    const parsed = JSON.parse(saved) as Partial<AppConfig>;
    return {
      moods: parsed.moods ?? DEFAULT_CONFIG.moods,
      periods: parsed.periods ?? DEFAULT_CONFIG.periods,
      noticeText: parsed.noticeText ?? DEFAULT_CONFIG.noticeText,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const writeConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const timeToHourMinute = (time: string): { hour: number; minute: number } => {
  const [h, m] = time.split(':').map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
};
