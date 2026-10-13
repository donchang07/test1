'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';

export type FleetTableRow = {
  vesselId: string; name: string; shipType: string; builtYear: number; pending: number;
  maxGrade: 'high' | 'medium' | 'low' | null; maxGradeLabel: string; planStatusLabel: string;
};

const SHIP_TYPES = ['전체', '벌크선', '유조선', '컨테이너선'] as const;

// SCR-002-EL-06~09: 검색·선종 칩·표·빈 상태
export default function FleetTable({ rows, adminSlot }: { rows: FleetTableRow[]; adminSlot: ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof SHIP_TYPES)[number]>('전체');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (type === '전체' || r.shipType === type)
      && (!q || r.name.toLowerCase().includes(q) || r.vesselId.toLowerCase().includes(q)));
  }, [rows, query, type]);

  const open = (vesselId: string) => router.push(`/vessels/${vesselId}`);

  return (
    <>
      <div className="toolbar">
        <input
          type="search" className="search-input" placeholder="선박명 또는 ID 검색" aria-label="선박 검색"
          data-testid="SCR-002-EL-06" value={query} onChange={(e) => setQuery(e.target.value)}
        />
        <div role="group" aria-label="선종" data-testid="SCR-002-EL-07" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHIP_TYPES.map((t) => (
            <button key={t} type="button" className="configurator-option-chip" aria-pressed={type === t}
              data-testid={`SCR-002-EL-07-${t}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {adminSlot}
      </div>
      {visible.length === 0 ? (
        <div className="inline-alert" role="status" data-testid="SCR-002-EL-09">조건에 맞는 선박이 없습니다.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="SCR-002-EL-08">
            <thead>
              <tr>
                <th>선박 ID</th><th>선박명</th><th className="hide-sm">선종</th><th className="hide-sm num">건조</th>
                <th className="num">미검토 판독</th><th>최고 위험</th><th>계획 상태</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const id = `SCR-002-EL-08-${r.vesselId}`;
                return (
                  <tr key={r.vesselId} role="link" tabIndex={0} data-testid={id}
                    onClick={() => open(r.vesselId)} onKeyDown={(e) => { if (e.key === 'Enter') open(r.vesselId); }}>
                    <td data-testid={`${id}-id`}>{r.vesselId}</td>
                    <td data-testid={`${id}-name`}>{r.name}</td>
                    <td className="hide-sm" data-testid={`${id}-type`}>{r.shipType}</td>
                    <td className="hide-sm num" data-testid={`${id}-built`}>{r.builtYear}</td>
                    <td className="num" data-testid={`${id}-pending`}>{r.pending}</td>
                    <td data-testid={`${id}-maxGrade`}>
                      <span className={`status-badge ${r.maxGrade ?? ''}`}>{r.maxGradeLabel}</span>
                    </td>
                    <td data-testid={`${id}-planStatus`}>{r.planStatusLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
