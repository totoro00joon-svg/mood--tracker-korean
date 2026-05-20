import { useEffect, useMemo, useState } from 'react';

type PeriodId = 'morning' | 'lunch' | 'evening';
type NotificationStatus = 'unsupported' | 'default' | 'granted' | 'denied';

type Period = {
  id: PeriodId;
  label: string;
  time: string;
  hour: number;
  minute: number;
};

type MoodRecord = {
  id: string;
  date: string;
  period: PeriodId;
  inputTime: string;
  mood: string;
  memo: string;
};

const PERIODS: Period[] = [
  { id: 'morning', label: '아침', time: '08:00', hour: 8, minute: 0 },
  { id: 'lunch', label: '점심', time: '12:00', hour: 12, minute: 0 },
  { id: 'evening', label: '저녁', time: '20:00', hour: 20, minute: 0 },
];

const MOODS = ['좋음', '보통', '불안', '우울', '짜증', '피곤', '평온'];
const RECORDS_KEY = 'mood-checkin.records';
const NOTIFIED_KEY = 'mood-checkin.notified';
const NOTICE_TEXT = '지금 기분을 기록할 시간입니다.';

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

const getPeriod = (id: PeriodId) => PERIODS.find((period) => period.id === id)!;

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

const getNextNotificationTarget = () => {
  const now = new Date();

  for (const period of PERIODS) {
    const target = new Date(now);
    target.setHours(period.hour, period.minute, 0, 0);

    if (target.getTime() > now.getTime()) {
      return { target, period };
    }
  }

  const target = new Date(now);
  target.setDate(target.getDate() + 1);
  target.setHours(PERIODS[0].hour, PERIODS[0].minute, 0, 0);
  return { target, period: PERIODS[0] };
};

function App() {
  const today = formatDate(new Date());
  const [records, setRecords] = useState<MoodRecord[]>(() => readRecords());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId>('morning');
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
      const { target, period } = getNextNotificationTarget();
      const delay = Math.max(target.getTime() - Date.now(), 1000);

      timeoutId = window.setTimeout(() => {
        const date = formatDate(target);
        const key = buildNotificationKey(date, period.id);
        const notifiedKeys = readNotifiedKeys();

        if (!notifiedKeys.includes(key)) {
          new Notification(NOTICE_TEXT);
          localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedKeys, key].slice(-30)));
        }

        schedule();
      }, delay);
    };

    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [notificationStatus]);

  const todayRecords = useMemo(
    () => records.filter((record) => record.date === today),
    [records, today],
  );

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return PERIODS.findIndex((period) => period.id === a.period) -
        PERIODS.findIndex((period) => period.id === b.period);
    });

    return filterDate ? sorted.filter((record) => record.date === filterDate) : sorted;
  }, [filterDate, records]);

  const moodCounts = useMemo(
    () =>
      MOODS.map((mood) => ({
        mood,
        count: records.filter((record) => record.mood === mood).length,
      })),
    [records],
  );

  const recentSummary = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const dateText = formatDate(date);
      const dayRecords = records.filter((record) => record.date === dateText);
      const completed = PERIODS.filter((period) =>
        dayRecords.some((record) => record.period === period.id),
      ).length;
      const moods = dayRecords.map((record) => record.mood).join(', ');

      return {
        date: dateText,
        completed,
        moods: moods || '기록 없음',
      };
    });
  }, [records]);

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
      (record) => record.date === today && record.period === selectedPeriod,
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
      if (existing) {
        return current.map((record) => (record.id === existing.id ? nextRecord : record));
      }

      return [nextRecord, ...current];
    });
  };

  const deleteRecord = (id: string) => {
    setRecords((current) => current.filter((record) => record.id !== id));
  };

  const getRecordForPeriod = (periodId: PeriodId) =>
    todayRecords.find((record) => record.period === periodId);

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
        <button
          className="notification-button"
          type="button"
          onClick={requestNotificationPermission}
          disabled={notificationStatus === 'granted' || notificationStatus === 'unsupported'}
        >
          {notificationLabel}
        </button>
      </section>

      <section className="grid-layout">
        <div className="panel today-panel">
          <div className="panel-title-row">
            <div>
              <p className="section-label">오늘의 입력 카드</p>
              <h2>{completionCount}/3 완료</h2>
            </div>
            <span className="completion-chip">
              {completionCount === 3 ? '완료' : `${3 - completionCount}개 남음`}
            </span>
          </div>

          <div className="period-grid" aria-label="아침 점심 저녁 기록 버튼">
            {PERIODS.map((period) => {
              const record = getRecordForPeriod(period.id);
              const isSelected = selectedPeriod === period.id;

              return (
                <button
                  key={period.id}
                  className={`period-card ${isSelected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedPeriod(period.id)}
                >
                  <span>{period.label}</span>
                  <strong>{period.time}</strong>
                  <small>{record ? `${record.mood} 기록됨` : '대기'}</small>
                </button>
              );
            })}
          </div>

          <div className="entry-box">
            <div className="entry-heading">
              <h3>{selectedPeriodInfo.label} 기록</h3>
              <span>{selectedPeriodInfo.time}</span>
            </div>

            <div className="mood-grid" aria-label="기분 선택 영역">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  className={`mood-button ${selectedMood === mood ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedMood(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>

            <label className="memo-label" htmlFor="memo">
              메모
            </label>
            <textarea
              id="memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
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
                  <em>{item.completed}/3</em>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="section-label">기분별 횟수</p>
            <div className="stats-list">
              {moodCounts.map((item) => (
                <div className="stat-row" key={item.mood}>
                  <span>{item.mood}</span>
                  <div className="stat-track">
                    <div
                      className="stat-bar"
                      style={{ width: `${(item.count / maxMoodCount) * 100}%` }}
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
              onChange={(event) => setFilterDate(event.target.value)}
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
            filteredRecords.map((record) => (
              <article className="record-item" key={record.id}>
                <div className="record-main">
                  <div className="record-meta">
                    <strong>{record.date}</strong>
                    <span>
                      {getPeriod(record.period).label} · {record.inputTime}
                    </span>
                  </div>
                  <div className="record-mood">{record.mood}</div>
                  {record.memo && <p>{record.memo}</p>}
                </div>
                <button type="button" onClick={() => deleteRecord(record.id)}>
                  삭제
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
