// src/server.ts
import express from 'express';
import cors from 'cors';

import recordsRouter from './routes/records';
import userRouter from './routes/user';
import { prisma } from './lib/prisma';  // 🔹 추가: Prisma 직접 사용

const app = express();
const PORT = 4000;

// 로그인 기능은 아직 없으니 고정 유저
const FIXED_USER_ID = 1;

app.use(cors());
app.use(express.json());

// 헬스 체크
app.get('/health-check', (req, res) => {
    res.json({ status: 'ok', message: 'health-coach API is running' });
});

// 기록 관련 라우터
app.use('/api/records', recordsRouter);

// 사용자(목표 혈압) 관련 라우터
app.use('/api/user', userRouter);

// 🔥 여기서 직접 seed API 한 번 더 처리해주기
// POST /api/records/dev/seed-bp
app.post('/api/records/dev/seed-bp', async (req, res) => {
    try {
        const { days, perDay } = req.body as {
            days?: number;
            perDay?: number;
        };

        const totalDays = days && days > 0 ? days : 14;
        const countPerDay = perDay && perDay > 0 ? perDay : 5;

        const now = new Date();
        const recordsToCreate: any[] = [];

        for (let d = 0; d < totalDays; d++) {
            for (let i = 0; i < countPerDay; i++) {
                const baseDate = new Date(now);
                baseDate.setDate(now.getDate() - d);
                baseDate.setHours(8 + i * 3); // 8시, 11시, 14시, 17시, 20시 등

                const sys = 120 + Math.round(Math.random() * 15) - 7; // 113~135
                const dia = 80 + Math.round(Math.random() * 10) - 5;  // 75~90

                recordsToCreate.push({
                    userId: FIXED_USER_ID,
                    type: 'blood_pressure',
                    datetime: baseDate,
                    value1: sys,
                    value2: dia,
                    state: null,
                    memo: null,
                    sleepHours: null,
                    exercise: null,
                    stressLevel: null,
                });
            }
        }

        await prisma.healthRecord.createMany({
            data: recordsToCreate,
        });

        return res.json({
            ok: true,
            created: recordsToCreate.length,
        });
    } catch (err) {
        console.error('POST /api/records/dev/seed-bp (in server.ts) error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
