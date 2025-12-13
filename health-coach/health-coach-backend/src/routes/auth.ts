// src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: '이메일과 비밀번호는 필수입니다.' });
        }

        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: name || null,
            },
        });

        // 회원가입 후 바로 로그인 처리하고 싶으면 토큰 발급
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: '7d',
        });

        return res.json({
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

// (참고) 로그인 라우트도 여기 같이 있을 수 있음
// router.post('/login', ...)

export default router;
