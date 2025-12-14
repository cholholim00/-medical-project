// src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

// .env 에서 읽고, 없으면 개발용 기본값
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// 🔹 토큰 생성 함수
function signToken(user: { id: number; email: string }) {
    return jwt.sign(
        { id: user.id, email: user.email }, // payload
        JWT_SECRET,
        { expiresIn: '7d' },                // 토큰 7일 유지
    );
}

/**
 * 회원가입
 * POST /api/auth/register
 * body: { email, password, name? }
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body as {
            email?: string;
            password?: string;
            name?: string;
        };

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: 'email과 password는 필수입니다.' });
        }

        // 이미 가입된 이메일인지 확인
        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            return res
                .status(400)
                .json({ error: '이미 가입된 이메일입니다.' });
        }

        // 비밀번호 해시
        const passwordHash = await bcrypt.hash(password, 10);

        // 유저 생성
        const user = await prisma.user.create({
            data: {
                email,
                name: name ?? null,
                passwordHash, // ⚠️ User 모델에 passwordHash 필드 있어야 함
            },
        });

        const token = signToken(user);

        console.log('✅ register success:', user.email);

        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (err) {
        console.error('register error', err);
        return res
            .status(500)
            .json({ error: '회원가입 중 서버 오류가 발생했습니다.' });
    }
});

/**
 * 로그인
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body as {
            email?: string;
            password?: string;
        };

        console.log('➡️  /api/auth/login body:', req.body);

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: 'email과 password는 필수입니다.' });
        }

        // 이메일로 유저 찾기
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // 유저가 아예 없음 → 401
            return res
                .status(401)
                .json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 비밀번호 비교
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            // 비번 틀림 → 401
            return res
                .status(401)
                .json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const token = signToken(user);

        console.log('✅ login success:', user.email);

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (err) {
        console.error('login error', err);
        return res
            .status(500)
            .json({ error: '로그인 중 서버 오류가 발생했습니다.' });
    }
});

export default router;
