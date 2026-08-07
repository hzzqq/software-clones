import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { HttpError } from '../lib/httpError';
import {
  listEnvironments,
  getEnvironment,
  getActiveEnvironment,
  createEnvironment,
  updateEnvironment,
  activateEnvironment,
  deactivateAll,
  deleteEnvironment,
} from '../repositories/environmentRepo';

const router = Router();

/**
 * 校验并规范化「变量表」入参：必须是普通对象，值一律转成字符串，空键忽略。
 * 非法结构（数组 / 字符串 / null）直接抛 400，避免脏数据写库。
 */
function normalizeVariables(raw: unknown): Record<string, string> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpError(400, 40000, 'variables 必须是键值对象');
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = k.trim();
    if (!key) continue;
    if (v !== null && typeof v === 'object') {
      throw new HttpError(400, 40000, `变量 ${key} 的值必须是标量`);
    }
    out[key] = v == null ? '' : String(v);
  }
  return out;
}

/** 解析路径中的数值 id，非法时抛 400。 */
function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 40000, '非法的环境 id');
  return id;
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ code: 0, message: 'ok', data: listEnvironments() });
  }),
);

// 注意：'/active' 必须注册在 '/:id' 之前，否则会被当成 id 匹配。
router.get(
  '/active',
  asyncHandler(async (_req, res) => {
    res.json({ code: 0, message: 'ok', data: getActiveEnvironment() });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name : '';
    const variables = normalizeVariables(body.variables);
    const created = createEnvironment({ name, variables, active: body.active === true });
    res.status(201).json({ code: 0, message: 'ok', data: created });
  }),
);

/** 取消所有环境的激活（对应前端「不使用环境」）。放在 '/:id' 之前避免歧义。 */
router.post(
  '/deactivate',
  asyncHandler(async (_req, res) => {
    deactivateAll();
    res.json({ code: 0, message: 'ok', data: { active: null } });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const env = getEnvironment(parseId(req.params.id));
    if (!env) throw new HttpError(404, 40400, '环境不存在');
    res.json({ code: 0, message: 'ok', data: env });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const body = req.body ?? {};
    const patch: { name?: string; variables?: Record<string, string> } = {};
    if (typeof body.name === 'string') patch.name = body.name;
    if (body.variables !== undefined) patch.variables = normalizeVariables(body.variables);
    const updated = updateEnvironment(id, patch);
    if (!updated) throw new HttpError(404, 40400, '环境不存在');
    res.json({ code: 0, message: 'ok', data: updated });
  }),
);

router.post(
  '/:id/activate',
  asyncHandler(async (req, res) => {
    const activated = activateEnvironment(parseId(req.params.id));
    if (!activated) throw new HttpError(404, 40400, '环境不存在');
    res.json({ code: 0, message: 'ok', data: activated });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ok = deleteEnvironment(parseId(req.params.id));
    if (!ok) throw new HttpError(404, 40400, '环境不存在');
    res.json({ code: 0, message: 'ok', data: { deleted: true } });
  }),
);

export default router;
