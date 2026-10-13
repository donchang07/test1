export const NOTICE = '모든 데이터는 합성 데이터이며 실제 선박·선급 기록이 아닙니다.';

export default function Footer() {
  return (
    <footer className="footer">
      <p data-testid="FOOTER-NOTICE">{NOTICE}</p>
    </footer>
  );
}
