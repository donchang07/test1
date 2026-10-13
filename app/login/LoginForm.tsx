'use client';

import { useState, type FormEvent } from 'react';

export default function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password'), next }),
      });
      if (res.ok) {
        const { next: target } = await res.json();
        window.location.assign(target);
        return;
      }
      setError(res.status === 401 ? '이메일 또는 비밀번호가 올바르지 않습니다.' : '일시적인 오류입니다. 잠시 후 다시 시도하세요.');
      setPassword('');
    } catch {
      setError('일시적인 오류입니다. 잠시 후 다시 시도하세요.');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }} noValidate={false}>
      <div className="field">
        <label htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="text-input" data-testid="SCR-001-EL-02" />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password" className="text-input"
          data-testid="SCR-001-EL-03" value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="button-primary" data-testid="SCR-001-EL-04" disabled={submitting}>
        {submitting ? '로그인 중…' : '로그인'}
      </button>
      {error && <div className="inline-alert error" role="alert" data-testid="SCR-001-EL-05">{error}</div>}
    </form>
  );
}
