import { describe, it, expect } from 'vitest';
import { toFfColor } from '../services/ffmpeg.js';
import { parseJson } from '../utils/http.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

describe('ffmpeg color helper', () => {
  it('converts hex to ffmpeg color', () => {
    expect(toFfColor('#22c55e')).toBe('0x22c55e');
    expect(toFfColor('0ea5e9')).toBe('0x0ea5e9');
  });
  it('falls back on invalid input', () => {
    expect(toFfColor('nope')).toBe('0x22c55e');
    expect(toFfColor('', '0x000000')).toBe('0x000000');
  });
});

describe('parseJson', () => {
  it('parses valid json', () => {
    expect(parseJson<number[]>('[1,2,3]', [])).toEqual([1, 2, 3]);
  });
  it('returns fallback on invalid json', () => {
    expect(parseJson('{bad', { a: 1 })).toEqual({ a: 1 });
    expect(parseJson(null, [])).toEqual([]);
  });
});

describe('jwt', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ sub: 'u1', email: 'a@b.com', role: 'USER' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('USER');
  });
});

describe('password hashing', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
