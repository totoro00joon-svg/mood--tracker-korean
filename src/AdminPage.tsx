import { useState } from 'react';
import {
  AppConfig,
  MoodConfig,
  PeriodConfig,
  DEFAULT_CONFIG,
  readConfig,
  writeConfig,
  timeToHourMinute,
} from './config';

const EMPTY_MOOD: MoodConfig = { label: '', emoji: '', color: '#52796f' };

export function AdminPage() {
  const [config, setConfig] = useState<AppConfig>(() => readConfig());
  const [tab, setTab] = useState<'moods' | 'periods' | 'notice'>('moods');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newMood, setNewMood] = useState<MoodConfig>(EMPTY_MOOD);
  const [toast, setToast] = useState(false);
  const [noticeText, setNoticeText] = useState(config.noticeText);

  const save = (next: AppConfig) => {
    setConfig(next);
    writeConfig(next);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const updateMood = (index: number, mood: MoodConfig) => {
    const moods = config.moods.map((m, i) => (i === index ? mood : m));
    save({ ...config, moods });
    setEditingIndex(null);
  };

  const deleteMood = (index: number) => {
    save({ ...config, moods: config.moods.filter((_, i) => i !== index) });
  };

  const moveMood = (index: number, dir: -1 | 1) => {
    const moods = [...config.moods];
    const target = index + dir;
    if (target < 0 || target >= moods.length) return;
    [moods[index], moods[target]] = [moods[target], moods[index]];
    save({ ...config, moods });
  };

  const addMood = () => {
    if (!newMood.label.trim() || !newMood.emoji.trim()) return;
    save({ ...config, moods: [...config.moods, { ...newMood, label: newMood.label.trim() }] });
    setNewMood(EMPTY_MOOD);
  };

  const updatePeriod = (index: number, period: PeriodConfig) => {
    const { hour, minute } = timeToHourMinute(period.time);
    const periods = config.periods.map((p, i) =>
      i === index ? { ...period, hour, minute } : p,
    );
    save({ ...config, periods });
  };

  const saveNotice = () => {
    save({ ...config, noticeText: noticeText.trim() || DEFAULT_CONFIG.noticeText });
  };

  const resetAll = () => {
    if (!window.confirm('모든 설정을 초기값으로 되돌릴까요?')) return;
    save(DEFAULT_CONFIG);
    setNoticeText(DEFAULT_CONFIG.noticeText);
  };

  return (
    <main className="app-shell">
      <section className="top-area">
        <div>
          <p className="eyebrow">관리자</p>
          <h1>앱 설정</h1>
        </div>
        <div className="top-actions">
          <button className="export-button" type="button" onClick={resetAll}>
            초기화
          </button>
          <a className="notification-button admin-back-btn" href=".">
            ← 앱으로 돌아가기
          </a>
        </div>
      </section>

      {toast && <div className="save-toast">저장되었습니다 ✓</div>}

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'moods' ? 'active' : ''}
          onClick={() => setTab('moods')}
        >
          😊 감정 관리
        </button>
        <button
          type="button"
          className={tab === 'periods' ? 'active' : ''}
          onClick={() => setTab('periods')}
        >
          🕐 시간대 설정
        </button>
        <button
          type="button"
          className={tab === 'notice' ? 'active' : ''}
          onClick={() => setTab('notice')}
        >
          🔔 알림 메시지
        </button>
      </div>

      {tab === 'moods' && (
        <section className="panel admin-panel">
          <p className="section-label">감정 목록 ({config.moods.length}개)</p>

          <div className="mood-admin-list">
            {config.moods.map((mood, index) =>
              editingIndex === index ? (
                <MoodEditRow
                  key={index}
                  mood={mood}
                  onSave={(m) => updateMood(index, m)}
                  onCancel={() => setEditingIndex(null)}
                />
              ) : (
                <div key={index} className="mood-admin-row">
                  <div className="mood-order-btns">
                    <button
                      type="button"
                      onClick={() => moveMood(index, -1)}
                      disabled={index === 0}
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMood(index, 1)}
                      disabled={index === config.moods.length - 1}
                      title="아래로"
                    >
                      ▼
                    </button>
                  </div>
                  <span
                    className="mood-preview-chip"
                    style={{ background: mood.color + '22', color: mood.color }}
                  >
                    {mood.emoji} {mood.label}
                  </span>
                  <div className="row-actions">
                    <button type="button" onClick={() => setEditingIndex(index)}>
                      수정
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => deleteMood(index)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mood-add-form">
            <p className="section-label">새 감정 추가</p>
            <div className="form-row">
              <input
                className="emoji-input"
                placeholder="이모지"
                value={newMood.emoji}
                onChange={(e) => setNewMood({ ...newMood, emoji: e.target.value })}
                maxLength={2}
              />
              <input
                placeholder="감정 이름"
                value={newMood.label}
                onChange={(e) => setNewMood({ ...newMood, label: e.target.value })}
                maxLength={10}
              />
              <input
                type="color"
                className="color-input"
                value={newMood.color}
                onChange={(e) => setNewMood({ ...newMood, color: e.target.value })}
                title="색상 선택"
              />
              <button
                type="button"
                className="save-button"
                onClick={addMood}
                disabled={!newMood.label.trim() || !newMood.emoji.trim()}
              >
                추가
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === 'periods' && (
        <section className="panel admin-panel">
          <p className="section-label">시간대 설정 (3개 고정)</p>
          <div className="period-edit-list">
            {config.periods.map((period, index) => (
              <div key={period.id} className="period-edit-row">
                <span className="period-id-label">{period.id}</span>
                <input
                  className="emoji-input"
                  placeholder="이모지"
                  value={period.emoji}
                  onChange={(e) => updatePeriod(index, { ...period, emoji: e.target.value })}
                  maxLength={2}
                />
                <input
                  placeholder="이름"
                  value={period.label}
                  onChange={(e) => updatePeriod(index, { ...period, label: e.target.value })}
                  maxLength={10}
                />
                <input
                  type="time"
                  value={period.time}
                  onChange={(e) => updatePeriod(index, { ...period, time: e.target.value })}
                />
              </div>
            ))}
          </div>
          <p className="admin-hint">변경 사항은 즉시 저장됩니다.</p>
        </section>
      )}

      {tab === 'notice' && (
        <section className="panel admin-panel">
          <p className="section-label">브라우저 알림 메시지</p>
          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            rows={3}
            placeholder={DEFAULT_CONFIG.noticeText}
            maxLength={100}
          />
          <p className="admin-hint">{noticeText.length}/100자</p>
          <button type="button" className="save-button" onClick={saveNotice}>
            저장
          </button>
        </section>
      )}
    </main>
  );
}

function MoodEditRow({
  mood,
  onSave,
  onCancel,
}: {
  mood: MoodConfig;
  onSave: (m: MoodConfig) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<MoodConfig>(mood);

  return (
    <div className="mood-admin-row editing form-row">
      <input
        className="emoji-input"
        placeholder="이모지"
        value={draft.emoji}
        onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
        maxLength={2}
      />
      <input
        placeholder="감정 이름"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        maxLength={10}
      />
      <input
        type="color"
        className="color-input"
        value={draft.color}
        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
      />
      <button
        type="button"
        className="save-button"
        onClick={() => onSave(draft)}
        disabled={!draft.label.trim() || !draft.emoji.trim()}
      >
        저장
      </button>
      <button type="button" onClick={onCancel}>
        취소
      </button>
    </div>
  );
}
