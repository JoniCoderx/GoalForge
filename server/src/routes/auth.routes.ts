import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler, badRequest, unauthorized } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { TEMPLATE_SEEDS } from '../data/templates.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const palette = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#f43f5e', '#14b8a6'];

function publicUser(u: { id: string; name: string; email: string; role: string; avatarColor: string; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatarColor: u.avatarColor, createdAt: u.createdAt };
}

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw badRequest('An account with this email already exists');

    const passwordHash = await hashPassword(password);
    const avatarColor = palette[Math.floor(Math.random() * palette.length)];
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash, avatarColor },
    });

    // Provision default brand settings so the app works immediately.
    await prisma.brandSettings.create({ data: { userId: user.id } });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.status(201).json({ token, user: publicUser(user), templatesAvailable: TEMPLATE_SEEDS.length });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw unauthorized('Invalid email or password');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid email or password');

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ token, user: publicUser(user) });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user) });
  })
);

export default router;
