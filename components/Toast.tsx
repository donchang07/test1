'use client';

import { useEffect, useRef } from 'react';

// toast(PRD 9.3): 하단 중앙, 4초 후 사라짐. 같은 문구가 다시 뜨면 key로 새로 마운트한다.
export default function Toast({ testid, message, onDone }: { testid: string; message: string; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 4000);
    return () => clearTimeout(t);
  }, []);
  return <div className="toast" role="status" data-testid={testid}>{message}</div>;
}
