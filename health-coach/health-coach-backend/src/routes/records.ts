// src/routes/records.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 지금은 로그인 없이 고정 유저 1명이라고 가정
const FIXED_USER_ID = 1;

// 유틸: 평균 계산
const avg = (nums: number[]): number | null => {
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum / nums.length;
};

// ---------------------------------------------------------------------
// 1) 기록 목록 조회: GET /api/records?type=blood_pressure
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;

        const where: any = {
            userId: FIXED_USER_ID,
        };

        if (typeof type === 'string') {
            where.type = type;
        }

        const records = await prisma.healthRecord.findMany({
            where,
            orderBy: { datetime: 'desc' },
        });

        return res.json(records);
    } catch (err) {
        console.error('GET /api/records error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ---------------------------------------------------------------------
// 2) 기록 생성: POST /api/records
// body: { type, datetime, value1, value2?, pulse?, state?, memo?, sleepHours?, exercise?, stressLevel? }
// ---------------------------------------------------------------------
router.post('/', async (req, res) => {
    try {
        const {
            type,
            datetime,
            value1,
            value2,
            pulse,
            state,
            memo,
            sleepHours,
            exercise,
            stressLevel,
        } = req.body;

        if (!type || typeof value1 !== 'number' || !datetime) {
            return res
                .status(400)
                .json({ error: 'type, datetime, value1(수축기)는 필수입니다.' });
        }

        const date = new Date(datetime);

        const created = await prisma.healthRecord.create({
            data: {
                userId: FIXED_USER_ID,
                type,
                datetime: date,
                value1,
                value2: typeof value2 === 'number' ? value2 : null,
                pulse: typeof pulse === 'number' ? pulse : null,
                state: state ?? null,
                memo: memo ?? null,
                sleepHours:
                    typeof sleepHours === 'number' && sleepHours > 0
                        ? sleepHours
                        : null,
                exercise:
                    typeof exercise === 'boolean' ? exercise : null,
                stressLevel:
                    typeof stressLevel === 'number' && stressLevel > 0
                        ? stressLevel
                        : null,
            },
        });

        return res.status(201).json(created);
    } catch (err) {
        console.error('POST /api/records error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ---------------------------------------------------------------------
// 3) 요약 통계: GET /api/records/stats/summary?rangeDays=7
//  - 최근 N일 혈압/혈당 평균, 카운트
// ---------------------------------------------------------------------
router.get('/stats/summary', async (req, res) => {
    try {
        const rangeDays = parseInt(req.query.rangeDays as string, 10) || 7;

        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - rangeDays);

        const records = await prisma.healthRecord.findMany({
            where: {
                userId: FIXED_USER_ID,
                datetime: {
                    gte: from,
                    lte: now,
                },
            },
        });

        const bp = records.filter((r) => r.type === 'blood_pressure');
        const bs = records.filter((r) => r.type === 'blood_sugar');

        const bpSys = bp
            .map((r) => r.value1)
            .filter((n): n is number => typeof n === 'number');
        const bpDia = bp
            .map((r) => r.value2)
            .filter((n): n is number => typeof n === 'number');

        const bsVals = bs
            .map((r) => r.value1)
            .filter((n): n is number => typeof n === 'number');

        return res.json({
            rangeDays,
            blood_pressure: {
                count: bp.length,
                avg_sys: avg(bpSys),
                avg_dia: avg(bpDia),
            },
            blood_sugar: {
                count: bs.length,
                avg: avg(bsVals),
            },
        });
    } catch (err) {
        console.error('GET /api/records/stats/summary error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ---------------------------------------------------------------------
// 4) 라이프스타일 통계: GET /api/records/stats/lifestyle?rangeDays=30
//  - 수면/운동/스트레스 그룹별 평균 혈압
// ---------------------------------------------------------------------
router.get('/stats/lifestyle', async (req, res) => {
    try {
        const rangeDays = parseInt(req.query.rangeDays as string, 10) || 30;

        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - rangeDays);

        const records = await prisma.healthRecord.findMany({
            where: {
                userId: FIXED_USER_ID,
                type: 'blood_pressure',
                datetime: {
                    gte: from,
                    lte: now,
                },
            },
        });

        type Bucket = {
            count: number;
            sumSys: number;
            sumDia: number;
        };

        const makeBucket = (): Bucket => ({
            count: 0,
            sumSys: 0,
            sumDia: 0,
        });

        const sleep = {
            short: makeBucket(), // < 6h
            enough: makeBucket(), // ≥ 6h
        };

        const exercise = {
            yes: makeBucket(),
            no: makeBucket(),
        };

        const stress = {
            low: makeBucket(), // 1~2
            mid: makeBucket(), // 3
            high: makeBucket(), // 4~5
        };

        const addTo = (b: Bucket, sys: number | null, dia: number | null) => {
            if (sys == null || dia == null) return;
            b.count += 1;
            b.sumSys += sys;
            b.sumDia += dia;
        };

        for (const r of records) {
            const sys = r.value1;
            const dia = r.value2;

            // 수면
            if (typeof r.sleepHours === 'number' && r.sleepHours > 0) {
                if (r.sleepHours < 6) addTo(sleep.short, sys, dia);
                else addTo(sleep.enough, sys, dia);
            }

            // 운동
            if (typeof r.exercise === 'boolean') {
                if (r.exercise) addTo(exercise.yes, sys, dia);
                else addTo(exercise.no, sys, dia);
            }

            // 스트레스
            if (typeof r.stressLevel === 'number' && r.stressLevel > 0) {
                if (r.stressLevel <= 2) addTo(stress.low, sys, dia);
                else if (r.stressLevel === 3) addTo(stress.mid, sys, dia);
                else addTo(stress.high, sys, dia);
            }
        }

        const finalize = (b: Bucket) => {
            if (b.count === 0) {
                return {
                    count: 0,
                    avg_sys: null as number | null,
                    avg_dia: null as number | null,
                };
            }
            return {
                count: b.count,
                avg_sys: b.sumSys / b.count,
                avg_dia: b.sumDia / b.count,
            };
        };

        return res.json({
            rangeDays,
            sleep: {
                short: finalize(sleep.short),
                enough: finalize(sleep.enough),
            },
            exercise: {
                yes: finalize(exercise.yes),
                no: finalize(exercise.no),
            },
            stress: {
                low: finalize(stress.low),
                mid: finalize(stress.mid),
                high: finalize(stress.high),
            },
        });
    } catch (err) {
        console.error('GET /api/records/stats/lifestyle error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ---------------------------------------------------------------------
// 5) 샘플 혈압 데이터 생성: POST /api/records/dev/seed-bp
//    - 상태(state), 메모(memo), 수면/운동/스트레스까지 포함
// ---------------------------------------------------------------------
router.post('/dev/seed-bp', async (req, res) => {
    try {
        const { days = 14, perDay = 5 } = req.body ?? {};

        const now = new Date();

        const stateOptions = [
            '아침 공복',
            '출근 전',
            '점심 식사 후',
            '퇴근 후',
            '운동 후',
            '잠들기 전',
        ];

        const memoOptions = [
            '어제보다 컨디션이 괜찮음',
            '약간 두통이 있었음',
            '커피를 평소보다 많이 마심',
            '스트레스가 좀 있었던 날',
            '가볍게 산책함',
            '짭짤한 음식을 많이 먹음',
            '오늘은 비교적 편안한 하루',
            '야근 후 측정',
        ];

        const randInt = (min: number, max: number) =>
            Math.floor(Math.random() * (max - min + 1)) + min;

        function pick<T>(arr: T[]): T {
            return arr[randInt(0, arr.length - 1)];
        }

        const data: import('@prisma/client').Prisma.HealthRecordCreateManyInput[] =
            [];

        for (let d = 0; d < days; d++) {
            const baseDate = new Date(now);
            baseDate.setDate(now.getDate() - d);

            for (let i = 0; i < perDay; i++) {
                const slot = i % 4;
                let hour = 8;
                if (slot === 0) hour = randInt(7, 9); // 아침
                else if (slot === 1) hour = randInt(12, 14); // 점심
                else if (slot === 2) hour = randInt(18, 21); // 저녁
                else if (slot === 3) hour = randInt(22, 23); // 늦은 밤

                const minute = randInt(0, 59);

                const dt = new Date(baseDate);
                dt.setHours(hour, minute, 0, 0);

                const sys = randInt(110, 135);
                const dia = randInt(70, 90);

                const sleepHoursRaw = randInt(4, 9); // 4~9시간
                const sleepHours =
                    sleepHoursRaw + (Math.random() < 0.5 ? 0 : 0.5); // .0 또는 .5

                const exercised = Math.random() < 0.4;
                const stressLevel = randInt(1, 5);

                data.push({
                    userId: FIXED_USER_ID,
                    type: 'blood_pressure',
                    datetime: dt,
                    value1: sys,
                    value2: dia,
                    pulse: randInt(60, 90),
                    state: pick(stateOptions),
                    memo: pick(memoOptions),
                    sleepHours,
                    exercise: exercised,
                    stressLevel,
                });
            }
        }

        // 필요하면 기존 데이터 지우고 다시 채우고 싶을 때:
        //await prisma.healthRecord.deleteMany({ where: { userId: FIXED_USER_ID } });

        await prisma.healthRecord.createMany({ data });

        return res.json({
            ok: true,
            created: data.length,
            days,
            perDay,
        });
    } catch (err) {
        console.error('POST /api/records/dev/seed-bp error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// 5-2) 현재 사용자 혈압 기록 전체 삭제 (개발용)
// DELETE /api/records/dev/clear-all
router.delete('/dev/clear-all', async (req, res) => {
    try {
        const result = await prisma.healthRecord.deleteMany({
            where: { userId: FIXED_USER_ID },
        });

        return res.json({
            ok: true,
            deleted: result.count,
        });
    } catch (err) {
        console.error('DELETE /api/records/dev/clear-all error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});


// ---------------------------------------------------------------------
// 6) 단일 기록 조회/수정/삭제: /api/records/:id
//    - 맨 마지막에 둬야 /stats/... /dev/... 과 안 겹침
// ---------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const record = await prisma.healthRecord.findUnique({
            where: { id },
        });

        if (!record || record.userId !== FIXED_USER_ID) {
            return res.status(404).json({ error: 'record not found' });
        }

        return res.json(record);
    } catch (err) {
        console.error('GET /api/records/:id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const existing = await prisma.healthRecord.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== FIXED_USER_ID) {
            return res.status(404).json({ error: 'record not found' });
        }

        const {
            type,
            datetime,
            value1,
            value2,
            pulse,
            state,
            memo,
            sleepHours,
            exercise,
            stressLevel,
        } = req.body;

        if (!type || typeof value1 !== 'number') {
            return res
                .status(400)
                .json({ error: 'type과 value1(수치)는 필수입니다.' });
        }

        const date = datetime ? new Date(datetime) : existing.datetime;

        const updated = await prisma.healthRecord.update({
            where: { id },
            data: {
                type,
                datetime: date,
                value1,
                value2: typeof value2 === 'number' ? value2 : null,
                pulse: typeof pulse === 'number' ? pulse : null,
                state: state ?? null,
                memo: memo ?? null,
                sleepHours:
                    typeof sleepHours === 'number' && sleepHours > 0
                        ? sleepHours
                        : null,
                exercise:
                    typeof exercise === 'boolean'
                        ? exercise
                        : null,
                stressLevel:
                    typeof stressLevel === 'number' && stressLevel > 0
                        ? stressLevel
                        : null,
            },
        });

        return res.json(updated);
    } catch (err) {
        console.error('PUT /api/records/:id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const record = await prisma.healthRecord.findUnique({
            where: { id },
        });

        if (!record || record.userId !== FIXED_USER_ID) {
            return res.status(404).json({ error: 'record not found' });
        }

        await prisma.healthRecord.delete({ where: { id } });

        return res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/records/:id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

export default router;
