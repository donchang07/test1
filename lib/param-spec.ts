// SCR-008 모델 파라미터 입력 규칙(PRD 5.5 SCR-008, DATA-008). 화면과 API가 같은 규칙으로 검증한다.

export type ParamKey =
  | 'allowableDiminutionPct' | 'findingFactorPerSeverity' | 'defaultCorrosionRateMmPerYear'
  | 'riskHigh' | 'riskMedium' | 'defaultBudgetHours';

export type ParamValues = Record<ParamKey, number>;

export type ParamField = {
  key: ParamKey; testid: string; label: string; name: string; min: number; max: number; decimals: number;
};

export const PARAM_FIELDS: ParamField[] = [
  { key: 'allowableDiminutionPct', testid: 'SCR-008-EL-01', label: '허용 쇠모율(%)', name: '허용 쇠모율', min: 5, max: 40, decimals: 1 },
  { key: 'findingFactorPerSeverity', testid: 'SCR-008-EL-02', label: '판독 보정계수(심각도당)', name: '판독 보정계수', min: 0, max: 1, decimals: 2 },
  { key: 'defaultCorrosionRateMmPerYear', testid: 'SCR-008-EL-03', label: '기본 부식 속도(mm/년)', name: '기본 부식 속도', min: 0.01, max: 1, decimals: 3 },
  { key: 'riskHigh', testid: 'SCR-008-EL-04', label: '높음 기준(점)', name: '높음 기준', min: 1, max: 100, decimals: 0 },
  { key: 'riskMedium', testid: 'SCR-008-EL-05', label: '중간 기준(점)', name: '중간 기준', min: 0, max: 99, decimals: 0 },
  { key: 'defaultBudgetHours', testid: 'SCR-008-EL-06', label: '기본 검사 시간 예산(시간)', name: '기본 검사 시간 예산', min: 4, max: 200, decimals: 0 },
];

/** PRD 11.4.1 기본값 */
export const DEFAULT_PARAMS: ParamValues = {
  allowableDiminutionPct: 20,
  findingFactorPerSeverity: 0.2,
  defaultCorrosionRateMmPerYear: 0.1,
  riskHigh: 70,
  riskMedium: 40,
  defaultBudgetHours: 40,
};

function decimalsOf(text: string): number {
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

/**
 * 항목별 첫 오류 문구(SCR-008-EL-09). 오류가 없으면 빈 배열.
 * 범위·자릿수 위반은 범위 문구에 자릿수를 덧붙인다(PRD는 범위·관계 문구만 정의).
 */
export function validateParams(input: Record<ParamKey, string>): string[] {
  const errors: string[] = [];
  const parsed: Partial<ParamValues> = {};
  for (const f of PARAM_FIELDS) {
    const text = String(input[f.key] ?? '').trim();
    const value = Number(text);
    const range = `${f.name}은 ${f.min}~${f.max} 사이여야 합니다.`;
    if (text === '' || !Number.isFinite(value) || value < f.min || value > f.max) {
      errors.push(range);
    } else if (decimalsOf(text) > f.decimals) {
      errors.push(`${range} ${f.decimals === 0 ? '정수만 입력할 수 있습니다.' : `소수 ${f.decimals}자리까지 입력할 수 있습니다.`}`);
    } else {
      parsed[f.key] = value;
    }
  }
  if (parsed.riskHigh !== undefined && parsed.riskMedium !== undefined && parsed.riskMedium >= parsed.riskHigh) {
    errors.push('중간 기준은 높음 기준보다 작아야 합니다.');
  }
  return errors;
}

export function toInputs(values: ParamValues): Record<ParamKey, string> {
  return Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, String(values[f.key])])) as Record<ParamKey, string>;
}
