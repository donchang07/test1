'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { DEFAULT_PARAMS, PARAM_FIELDS, toInputs, validateParams, type ParamKey, type ParamValues } from '@/lib/param-spec';

type HistoryRow = { auditId: string; text: string };
type Inputs = Record<ParamKey, string>;

// SCR-008-EL-01~12: 모델 파라미터 폼과 변경 이력
export default function SettingsForm({ initial, history: initialHistory }: { initial: ParamValues; history: HistoryRow[] }) {
  const [saved, setSaved] = useState<Inputs>(() => toInputs(initial));
  const [inputs, setInputs] = useState<Inputs>(() => toInputs(initial));
  const [history, setHistory] = useState(initialHistory);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = PARAM_FIELDS.some((f) => inputs[f.key].trim() !== saved[f.key]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveFailed(false);
    const found = validateParams(inputs);
    setErrors(found);
    if (found.length) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (res.status === 400) {
        setErrors((await res.json()).messages ?? []);
      } else if (!res.ok) {
        setSaveFailed(true);
      } else {
        const data = (await res.json()) as { params: ParamValues; history: HistoryRow[] };
        const next = toInputs(data.params);
        setSaved(next);
        setInputs(next);
        setHistory(data.history);
        setToast(true);
      }
    } catch {
      setSaveFailed(true);
    }
    setSaving(false);
  }

  return (
    <>
      <form className="store-utility-card settings-form" onSubmit={onSubmit} noValidate>
        {PARAM_FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={f.key}>{f.label}</label>
            <input
              id={f.key}
              name={f.key}
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.decimals === 0 ? 1 : 1 / 10 ** f.decimals}
              className="text-input"
              data-testid={f.testid}
              value={inputs[f.key]}
              onChange={(e) => setInputs((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        {errors.length > 0 && (
          <div className="inline-alert error" role="alert" data-testid="SCR-008-EL-09">
            {errors.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}
        {saveFailed && (
          <div className="inline-alert error" role="alert" data-testid="SCR-008-EL-12">저장하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.</div>
        )}
        <div className="actions">
          <button
            type="button"
            className="button-secondary-pill"
            data-testid="SCR-008-EL-08"
            onClick={() => { setInputs(toInputs(DEFAULT_PARAMS)); setErrors([]); }}
          >
            기본값 복원
          </button>
          <button type="submit" className="button-primary" data-testid="SCR-008-EL-07" disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table" data-testid="SCR-008-EL-11">
          <caption className="section-title">변경 이력</caption>
          <tbody>
            {history.length === 0 ? (
              <tr><td>변경 이력이 없습니다.</td></tr>
            ) : history.map((h) => (
              <tr key={h.auditId} data-testid={`SCR-008-EL-11-${h.auditId}`}><td>{h.text}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <div className="toast" role="status" data-testid="SCR-008-EL-10">설정을 저장했습니다. 이후 예측과 시뮬레이션에 적용됩니다.</div>}
    </>
  );
}
