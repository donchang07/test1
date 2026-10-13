import { apiUser } from '@/lib/auth';
import { PARAM_FIELDS, validateParams, type ParamKey, type ParamValues } from '@/lib/param-spec';
import { currentParams, paramsHistory, saveParams } from '@/lib/settings';

// FR-032: 관리자만 모델 파라미터를 저장한다. 화면과 같은 규칙으로 서버에서 다시 검증한다.
export async function PUT(request: Request) {
  const user = await apiUser({ admin: true, target: 'PUT /api/admin/settings' });
  if (user instanceof Response) return user;
  const body = await request.json().catch(() => ({}));
  const input = Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, String(body?.[f.key] ?? '')])) as Record<ParamKey, string>;
  const errors = validateParams(input);
  if (errors.length) return Response.json({ error: 'validation', messages: errors }, { status: 400 });
  const values = Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, Number(input[f.key])])) as ParamValues;
  saveParams(values, user.userId);
  return Response.json({ params: currentParams(), history: paramsHistory() });
}
