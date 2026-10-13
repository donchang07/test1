import Link from 'next/link';

const STEPS = [
  { id: 'NAV-11', label: '개요', path: '' },
  { id: 'NAV-12', label: '① 판독', path: '/review' },
  { id: 'NAV-13', label: '② 예측', path: '/forecast' },
  { id: 'NAV-14', label: '③ 시뮬레이션', path: '/simulate' },
  { id: 'NAV-15', label: '④ 계획', path: '/plan' },
] as const;

// sub-nav-frosted: 선박명 + NAV-11~15 (PRD 5.3)
export default function VesselSubNav({ vesselId, name, active, pending }: {
  vesselId: string; name: string; active: (typeof STEPS)[number]['path']; pending: number;
}) {
  return (
    <div className="sub-nav">
      <div className="inner">
        <span className="title">{name}</span>
        <nav aria-label="선박 단계">
          {STEPS.map((s) => (
            <Link key={s.id} href={`/vessels/${vesselId}${s.path}`} data-testid={s.id} aria-current={active === s.path ? 'page' : undefined}>
              {s.label}{s.id === 'NAV-12' && pending > 0 ? ` (${pending})` : ''}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
