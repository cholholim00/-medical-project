// src/routes/user.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();
const FIXED_USER_ID = 1;

type UserProfileBody = {
    targetSys?: number;
    targetDia?: number;
};

// GET /api/user/profile
router.get('/profile', async (req, res) => {
    try {
        const profile = await prisma.userProfile.findUnique({
            where: { userId: FIXED_USER_ID },
        });

        if (!profile) {
            return res.status(404).json({ message: 'profile not set' });
        }

        return res.json(profile);
    } catch (err) {
        console.error('GET /api/user/profile error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// PUT /api/user/profile
router.put('/profile', async (req, res) => {
    try {
        const { targetSys, targetDia } = req.body as UserProfileBody;

        if (
            typeof targetSys !== 'number' ||
            typeof targetDia !== 'number' ||
            targetSys <= 0 ||
            targetDia <= 0
        ) {
            return res.status(400).json({
                error: 'targetSys and targetDia must be positive numbers',
            });
        }

        const profile = await prisma.userProfile.upsert({
            where: { userId: FIXED_USER_ID },
            create: {
                userId: FIXED_USER_ID,
                targetSys,
                targetDia,
            },
            update: {
                targetSys,
                targetDia,
            },
        });

        return res.json(profile);
    } catch (err) {
        console.error('PUT /api/user/profile error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

export default router;
