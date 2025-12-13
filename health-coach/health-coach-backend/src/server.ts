// src/server.ts
console.log('🌟🌟🌟 BACKEND ENTRY FROM src/server.ts 🌟🌟🌟');
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';

import recordsRouter from './routes/records';
import userRouter from './routes/user';
import aiRouter from './routes/ai';
import { prisma } from './lib/prisma';

console.log('🚀 health-coach backend STARTED (server.ts 로딩됨)');

const app = express();
const PORT = 5001;
const FIXED_USER_ID = 1;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

// 🔹 0. 이 서버가 맞는지 확인용 라우트
app.get('/__test', (req, res) => {
    res.json({
        ok: true,
        msg: 'this is health-coach-backend on port 5001',
        url: req.url,
    });
});

// 🔹 1. 헬스 체크
app.get('/health-check', (req, res) => {
    res.json({ status: 'ok', message: 'health-coach API is running' });
});

// 🔹 2. summary 라우트
app.get('/api/records/stats/summary', async (req, res) => {
    try {
        console.log('➡️  [server.ts] GET /api/records/stats/summary', req.query);

        const rangeParam = req.query.rangeDays as string | undefined;
        const rangeDays = rangeParam ? parseInt(rangeParam, 10) : 7;

        const now = new Date();
        const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        const calcAvg = (nums: number[]): number | null => {
            if (!nums.length) return null;
            const sum = nums.reduce((acc, n) => acc + n, 0);
            return sum / nums.length;
        };

        const [bpRecords, sugarRecords] = await Promise.all([
            prisma.healthRecord.findMany({
                where: {
                    userId: FIXED_USER_ID,
                    type: 'blood_pressure',
                    datetime: { gte: from },
                },
            }),
            prisma.healthRecord.findMany({
                where: {
                    userId: FIXED_USER_ID,
                    type: 'blood_sugar',
                    datetime: { gte: from },
                },
            }),
        ]);

        const sysList = bpRecords.map((r) => r.value1);
        const diaList = bpRecords
            .map((r) => r.value2)
            .filter((v): v is number => typeof v === 'number');

        const sugarList = sugarRecords.map((r) => r.value1);

        const avgSys = calcAvg(sysList);
        const avgDia = calcAvg(diaList);
        const avgSugar = calcAvg(sugarList);

        return res.json({
            rangeDays,
            blood_pressure: {
                count: bpRecords.length,
                avg_sys: avgSys,
                avg_dia: avgDia,
            },
            blood_sugar: {
                count: sugarRecords.length,
                avg: avgSugar,
            },
        });
    } catch (error) {
        console.error('[server.ts] GET /api/records/stats/summary error', error);
        return res
            .status(500)
            .json({ error: '혈압/혈당 요약 통계를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 🔹 3. 나머지 라우터 연결 (V1 기능들)
app.use('/api/records', recordsRouter);
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);

// (선택) 404 로깅
app.use((req, _res, next) => {
    console.log('⚠️  404 Not Found:', req.method, req.url);
    next();
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
