import { useEffect, useMemo, useState } from 'react';
import { readConfig, writeConfig, AppConfig, MoodConfig, PeriodConfig } from './config';

type PeriodId = string;
type NotificationStatus = 'unsupported' | 'default' | 'granted' | 'denied';

type MoodRecord = {
  id: string;
  date: string;
  period: PeriodId;
  inputTime: string;
  mood: string;
  memo: string;
};

const RECORDS_KEY = 'mood-checkin.records';
const NOTIFIED_KEY = 'mood-checkin.notified';

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatInputTime = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

const readRecords = (): MoodRecord[] => {
  try {
    const saved = localStorage.getItem(RECORDS_KEY);
    return saved ? (JSON.parse(saved) as MoodRecord[]) : [];
  } catch {
    return [];
  }
};

const readNotifiedKeys = (): string[] => {
  try {
    const saved = localStorage.getItem(NOTIFIED_KEY);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
};

const buildNotificationKey = (date: string, period: PeriodId) => `${date}:${period}`;

const getNextNotificationTarget = (periods: PeriodConfig[]) => {
  const now = new Date();

  for (const period of periods) {
    const target = new Date(now);
    target.setHours(period.hour, period.minute, 0, 0);
    if (target.getTime() > now.getTime()) {
      return { target, period };
    }
  }

  const target = new Date(now);
  target.setDate(target.getDate() + 1);
  target.setHours(periods[0].hour, periods[0].minute, 0, 0);
  return { target, period: periods[0] };
};

const exportRecordsAsJSON = (records: MoodRecord[]) => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mood-records-${formatDate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

function App() {
  const [appConfig, setAppConfig] = useState<AppConfig>(() => readConfig());
  const { moods, periods, noticeText } = appConfig;

  const moodMap = useMemo(
    () => Object.fromEntries(moods.map((m) => [m.label, m])),
    [moods],
  );
  const getMood = (label: string): MoodConfig | undefined => moodMap[label];
  const getPeriod = (id: PeriodId): PeriodConfig | undefined =>
    periods.find((p) => p.id === id);

  useEffect(() => {
    const onStorage = () => setAppConfig(readConfig());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const today = formatDate(new Date());
  const [records, setRecords] = useState<MoodRecord[]>(() => readRecords());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId>(periods[0]?.id ?? 'morning');
  const [selectedMood, setSelectedMood] = useState('');
  const [memo, setMemo] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  useEffect(() => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    const existing = records.find(
      (record) => record.date === today && record.period === selectedPeriod,
    );
    setSelectedMood(existing?.mood ?? '');
    setMemo(existing?.memo ?? '');
  }, [records, selectedPeriod, today]);

  useEffect(() => {
    if (notificationStatus !== 'granted') return;

    let timeoutId: number;

    const schedule = () => {
      const { target, period } = getNextNotificationTarget(periods);
      const delay = Math.max(target.getTime() - Date.now(), 1000);

      timeoutId = window.setTimeout(() => {
        const date = formatDate(target);
        const key = buildNotificationKey(date, period.id);
        const notifiedKeys = readNotifiedKeys();

        if (!notifiedKeys.includes(key)) {
          new Notification(noticeText);
          localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedKeys, key].slice(-30)));
        }

        schedule();
      }, delay);
    };

    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [notificationStatus, periods, noticeText]);

  const todayRecords = useMemo(
    () => records.filter((record) => record.date === today),
    [records, today],
  );

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (
        periods.findIndex((p) => p.id === a.period) -
        periods.findIndex((p) => p.id === b.period)
      );
    });
    return filterDate ? sorted.filter((r) => r.date === filterDate) : sorted;
  }, [filterDate, records, periods]);

  const moodCounts = useMemo(
    () =>
      moods.map((m) => ({
        ...m,
        count: records.filter((r) => r.mood === m.label).length,
      })),
    [records, moods],
  );

  const recentSummary = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const dateText = formatDate(date);
      const dayRecords = records.filter((r) => r.date === dateText);
      const completed = periods.filter((p) =>
        dayRecords.some((r) => r.period === p.id),
      ).length;
      const moodEmojis = dayRecords
        .map((r) => getMood(r.mood)?.emoji ?? r.mood)
        .join(' ');
      return { date: dateText, completed, moods: moodEmojis || '기록 없음' };
    });
  }, [records, periods, moodMap]);

  const completionCount = todayRecords.length;
  const selectedPeriodInfo = getPeriod(selectedPeriod);
  const maxMoodCount = Math.max(...moodCounts.map((item) => item.count), 1);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
  };

  const saveRecord = () => {
    if (!selectedMood) return;
    const now = new Date();
    const existing = records.find(
      (r) => r.date === today && r.period === selectedPeriod,
    );
    const nextRecord: MoodRecord = {
      id: existing?.id ?? `${today}-${selectedPeriod}-${now.getTime()}`,
      date: today,
      period: selectedPeriod,
      inputTime: formatInputTime(now),
      mood: selectedMood,
      memo: memo.trim(),
    };
    setRecords((current) => {
      if (existing) return current.map((r) => (r.id === existing.id ? nextRecord : r));
      return [nextRecord, ...current];
    });
  };

  const deleteRecord = (id: string) => {
    setRecords((current) => current.filter((r) => r.id !== id));
  };

  const getRecordForPeriod = (periodId: PeriodId) =>
    todayRecords.find((r) => r.period === periodId);

  const notificationLabel = {
    unsupported: '알림 미지원',
    default: '알림 켜기',
    granted: '알림 켜짐',
    denied: '알림 차단됨',
  }[notificationStatus];

  return (
    <main className="app-shell">
      <section className="top-area">
        <div>
          <p className="eyebrow">하루 세 번 감정 체크인</p>
          <h1>감정 기록</h1>
          <p className="today">{today}</p>
        </div>
        <div className="top-actions">
          <a className="admin-link-btn" href="#admin" title="앱 설정 관리자">
            ⚙️ 관리
          </a>
          <button
            className="export-button"
            type="button"
            onClick={() => exportRecordsAsJSON(records)}
            disabled={records.length === 0}
            title="기록을 JSON 파일로 내보냅니다"
          >
            📥 내보내기
          </button>
          <button
            className="notification-button"
            type="button"
            onClick={requestNotificationPermission}
            disabled={notificationStatus === 'granted' || notificationStatus === 'unsupported'}
          >
            {notificationLabel}
          </button>
        </div>
      </section>

      <section className="grid-layout">
        <div className="panel today-panel">
          <div className="panel-title-row">
            <div>
              <p className="section-label">오늘의 입력 카드</p>
              <h2>{completionCount}/{periods.length} 완료</h2>
            </div>
            <span className="completion-chip">
              {completionCount === periods.length
                ? '✅ 완료'
                : `${periods.length - completionCount}개 남음`}
            </span>
          </div>

          <div className="period-grid" aria-label="시간대 기록 버튼">
            {periods.map((period) => {
              const record = getRecordForPeriod(period.id);
              const isSelected = selectedPeriod === period.id;
              const recordMood = record ? getMood(record.mood) : undefined;

              return (
                <button
                  key={period.id}
                  className={`period-card ${isSelected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedPeriod(period.id)}
                >
                  <span className="period-emoji">{period.emoji}</span>
                  <span>{period.label}</span>
                  <strong>{period.time}</strong>
                  <small>
                    {record
                      ? `${recordMood?.emoji ?? ''} ${record.mood} 기록됨`
                      : '대기'}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="entry-box">
            <div className="entry-heading">
              <h3>
                {selectedPeriodInfo?.emoji} {selectedPeriodInfo?.label ?? ''} 기록
              </h3>
              <span>{selectedPeriodInfo?.time}</span>
            </div>

            <div className="mood-grid" aria-label="기분 선택 영역">
              {moods.map((m) => (
                <button
                  key={m.label}
                  className={`mood-button ${selectedMood === m.label ? 'selected' : ''}`}
                  style={
                    selectedMood === m.label
                      ? { background: m.color, borderColor: m.color }
                      : {}
                  }
                  type="button"
                  onClick={() => setSelectedMood(m.label)}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <label className="memo-label" htmlFor="memo">
              메모
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="지금 마음에 남은 말을 적어보세요."
              rows={5}
            />

            <button
              className="save-button"
              type="button"
              onClick={saveRecord}
              disabled={!selectedMood}
            >
              저장
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel">
            <p className="section-label">최근 7일 요약</p>
            <div className="summary-list">
              {recentSummary.map((item) => (
                <div className="summary-row" key={item.date}>
                  <div>
                    <strong>{item.date}</strong>
                    <span>{item.moods}</span>
                  </div>
                  <em>
                    {item.completed}/{periods.length}
                  </em>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="section-label">기분별 횟수</p>
            <div className="stats-list">
              {moodCounts.map((item) => (
                <div className="stat-row" key={item.label}>
                  <span>
                    {item.emoji} {item.label}
                  </span>
                  <div className="stat-track">
                    <div
                      className="stat-bar"
                      style={{
                        width: `${(item.count / maxMoodCount) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="panel records-panel">
        <div className="records-header">
          <div>
            <p className="section-label">누적 기록 리스트</p>
            <h2>저장된 감정</h2>
          </div>
          <div className="filter-group">
            <label htmlFor="date-filter">날짜 필터</label>
            <input
              id="date-filter"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button type="button" onClick={() => setFilterDate('')}>
                전체
              </button>
            )}
          </div>
        </div>

        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <p className="empty-state">아직 저장된 기록이 없습니다.</p>
          ) : (
            filteredRecords.map((record) => {
              const moodInfo = getMood(record.mood);
              const periodInfo = getPeriod(record.period);
              return (
                <article className="record-item" key={record.id}>
                  <div className="record-main">
                    <div className="record-meta">
                      <strong>{record.date}</strong>
                      <span>
                        {periodInfo?.emoji ?? ''} {periodInfo?.label ?? record.period} ·{' '}
                        {record.inputTime}
                      </span>
                    </div>
                    <div
                      className="record-mood"
                      style={
                        moodInfo
                          ? { background: moodInfo.color + '22', color: moodInfo.color }
                          : {}
                      }
                    >
                      {moodInfo?.emoji} {record.mood}
                    </div>
                    {record.memo && <p>{record.memo}</p>}
                  </div>
                  <button type="button" onClick={() => deleteRecord(record.id)}>
                    삭제
                  </button>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
