// src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

function signToken(user: { id: number; email: string }) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' },
    );
}

// ... (register / login 그대로 유지해도 됨)

/**
 * 내 정보 조회
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        return res.json({ user });
    } catch (err) {
        console.error('GET /api/auth/me error', err);
        return res
            .status(500)
            .json({ error: '내 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

/**
 * 회원 탈퇴
 * DELETE /api/auth/me
 */
router.delete('/me', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        console.log('🗑 DELETE /api/auth/me userId =', userId);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        // 연관 데이터까지 한 번에 정리 (트랜잭션)
        await prisma.$transaction([
            // 없어도 deleteMany는 조용히 0개 삭제하고 끝나서 에러 안 남
            prisma.aiCoachLog.deleteMany({ where: { userId } }),
            prisma.healthRecord.deleteMany({ where: { userId } }),
            prisma.userProfile.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        return res.json({ ok: true });
    } catch (err: any) {
        console.error('DELETE /api/auth/me error', err);

        // Prisma 에러 코드별로 보고 싶으면 여기에 분기 추가해도 됨
        return res
            .status(500)
            .json({ error: '회원 탈퇴 처리 중 서버 오류가 발생했습니다.' });
    }
});

export default router;