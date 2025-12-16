// src/routes/user.ts
import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/user/profile
 * - 로그인된 사용자의 목표 혈압 프로필 조회
 */
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const profile = await prisma.userProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            // 프론트에서 "아직 설정 안 했구나" 용으로 쓰는 404
            return res.status(404).json({ error: '프로필이 없습니다.' });
        }

        return res.json(profile);
    } catch (err) {
        console.error('GET /api/user/profile error', err);
        return res.status(500).json({
            error: '목표 혈압 정보를 불러오는 중 오류가 발생했습니다.',
        });
    }
});

/**
 * POST /api/user/profile
 * body: { targetSys: number, targetDia: number }
 * - upsert 로 새로 만들거나, 기존 것을 업데이트
 */
router.post('/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { targetSys, targetDia } = req.body as {
            targetSys?: number;
            targetDia?: number;
        };

        // 숫자 검증
        if (
            typeof targetSys !== 'number' ||
            Number.isNaN(targetSys) ||
            typeof targetDia !== 'number' ||
            Number.isNaN(targetDia)
        ) {
            return res
                .status(400)
                .json({ error: 'targetSys, targetDia는 숫자여야 합니다.' });
        }

        const profile = await prisma.userProfile.upsert({
            where: { userId },
            update: {
                targetSys,
                targetDia,
            },
            create: {
                userId,
                targetSys,
                targetDia,
            },
        });

        return res.json(profile);
    } catch (err: any) {
        console.error('POST /api/user/profile error', err);

        if (err.code === 'P2002') {
            // 유니크 제약 관련 에러일 때
            return res.status(500).json({
                error:
                    '프로필 저장 중 중복 키 오류가 발생했습니다. userProfile.userId가 unique 인지 확인해 주세요.',
            });
        }

        return res.status(500).json({
            error: '목표 혈압을 저장하는 중 서버 오류가 발생했습니다.',
        });
    }
});

export default router;