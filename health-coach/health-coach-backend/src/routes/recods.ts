// src/routes/records.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import type { HealthRecord as HealthRecordModel } from '@prisma/client';

const router = Router();

type RecordType = 'blood_sugar' | 'blood_pressure';
type DbRecord = HealthRecordModel;

const STATES = ['morning', 'after_meal', 'rest', 'stress', 'exercise'] as const;
type StateType = (typeof STATES)[number];

// 상태 코드 → 한국어 설명
function stateLabel(state: string): string {
    switch (state) {
        case 'morning':
            return '아침 시간에 측정한 혈압';
        case 'after_meal':
            return '식사 후에 측정한 혈압';
        case 'rest':
            return '휴식 중에 측정한 혈압';
        case 'stress':
            return '스트레스를 느낄 때 측정한 혈압';
        case 'exercise':
            return '운동 직후에 측정한 혈압';
        default:
            return `상태(${state})에서의 혈압`;
    }
}

// 랜덤 숫자 유틸 (샘플 데이터용)
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 최근 N일 기록만 DB에서 가져오는 유틸
async function getRecentRecords(
    days: number,
    type?: RecordType
): Promise<{ list: DbRecord[]; now: Date; fromDate: Date }> {
    const now = new Date();
    const fromDate = new Date();
    fromDate.setDate(now.getDate() - days);

    const where: any = {
        datetime: { gte: fromDate },
    };
    if (type) {
        where.type = type;
    }

    const list = await prisma.healthRecord.findMany({
        where,
        orderBy: { datetime: 'asc' },
    });

    return { list, now, fromDate };
}

// ✅ 기록 추가: POST /api/records
router.post('/', async (req, res) => {
    try {
        const {
            type,
            datetime,
            value1,
            value2,
            pulse,
            state,
            sleepHours,
            exercise,
            stressLevel,
            memo,
        } = req.body;

        if (type !== 'blood_sugar' && type !== 'blood_pressure') {
            return res
                .status(400)
                .json({ error: 'type must be blood_sugar or blood_pressure' });
        }

        if (typeof value1 !== 'number') {
            return res.status(400).json({ error: 'value1 must be a number' });
        }

        if (type === 'blood_pressure' && typeof value2 !== 'number') {
            return res
                .status(400)
                .json({ error: 'value2 must be a number for blood_pressure' });
        }

        let dt: Date;
        if (datetime) {
            dt = new Date(datetime);
            if (Number.isNaN(dt.getTime())) {
                return res.status(400).json({ error: 'invalid datetime format' });
            }
        } else {
            dt = new Date();
        }

        const created = await prisma.healthRecord.create({
            data: {
                userId: 1,
                datetime: dt,
                type,
                value1,
                value2,
                pulse,
                state,
                sleepHours,
                exercise,
                stressLevel,
                memo,
            },
        });

        return res.status(201).json(created);
    } catch (err) {
        console.error('POST /api/records error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ✅ 기록 조회: GET /api/records?type=...&from=...&to=...
router.get('/', async (req, res) => {
    try {
        const { type, from, to } = req.query;

        const where: any = {};

        if (type === 'blood_sugar' || type === 'blood_pressure') {
            where.type = type;
        }

        if (from || to) {
            where.datetime = {};
            if (from) {
                const fromDate = new Date(from as string);
                if (!Number.isNaN(fromDate.getTime())) {
                    where.datetime.gte = fromDate;
                }
            }
            if (to) {
                const toDate = new Date(to as string);
                if (!Number.isNaN(toDate.getTime())) {
                    where.datetime.lte = toDate;
                }
            }
        }

        const list = await prisma.healthRecord.findMany({
            where,
            orderBy: { datetime: 'desc' },
        });

        return res.json(list);
    } catch (err) {
        console.error('GET /api/records error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ✅ 간단 통계: 최근 N일 평균 (기본 7일)
// GET /api/records/stats/summary?rangeDays=7
router.get('/stats/summary', async (req, res) => {
    try {
        const rangeDays =
            typeof req.query.rangeDays === 'string'
                ? parseInt(req.query.rangeDays, 10) || 7
                : 7;

        const { list } = await getRecentRecords(rangeDays);

        const sugar = list.filter((r) => r.type === 'blood_sugar');
        const pressure = list.filter((r) => r.type === 'blood_pressure');

        const avg = (nums: number[]): number | null =>
            nums.length === 0
                ? null
                : nums.reduce((sum, v) => sum + v, 0) / nums.length;

        const sugarAvg = avg(sugar.map((r) => r.value1));

        const sysAvg = avg(pressure.map((r) => r.value1)); // 수축기
        const diaAvg = avg(
            pressure
                .map((r) => r.value2)
                .filter((v): v is number => typeof v === 'number')
        ); // 이완기

        return res.json({
            rangeDays,
            blood_sugar: {
                count: sugar.length,
                avg: sugarAvg,
            },
            blood_pressure: {
                count: pressure.length,
                avg_sys: sysAvg,
                avg_dia: diaAvg,
            },
        });
    } catch (err) {
        console.error('GET /api/records/stats/summary error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ✅ 개발용: 샘플 혈압 데이터 자동 생성
// POST /api/records/dev/seed-bp  { "days": 14, "perDay": 5 }
router.post('/dev/seed-bp', async (req, res) => {
    try {
        const { days = 7, perDay = 4 } = (req.body || {}) as {
            days?: number;
            perDay?: number;
        };

        const now = new Date();
        const data: Omit<DbRecord, 'id' | 'createdAt'>[] = [];

        for (let d = 0; d < days; d++) {
            const dayDate = new Date(now);
            dayDate.setDate(now.getDate() - d);

            for (let i = 0; i < perDay; i++) {
                const hour = randomInt(7, 22);
                const minute = randomInt(0, 59);
                const date = new Date(dayDate);
                date.setHours(hour, minute, 0, 0);

                const state: StateType = STATES[randomInt(0, STATES.length - 1)];

                let sysBase = 125;
                let diaBase = 80;

                if (state === 'stress') {
                    sysBase += 8;
                    diaBase += 5;
                } else if (state === 'exercise') {
                    sysBase += 5;
                    diaBase += 3;
                } else if (state === 'morning') {
                    sysBase -= 3;
                    diaBase -= 2;
                }

                const sys = randomInt(sysBase - 5, sysBase + 5);
                const dia = randomInt(diaBase - 4, diaBase + 4);
                const pulse = randomInt(60, 85);

                data.push({
                    userId: 1,
                    datetime: date,
                    type: 'blood_pressure',
                    value1: sys,
                    value2: dia,
                    pulse,
                    state,
                    sleepHours: null,
                    exercise: null,
                    stressLevel: null,
                    memo: `자동 생성 샘플 (${state})`,
                });
            }
        }

        const result = await prisma.healthRecord.createMany({
            data,
        });

        return res.json({
            message: '샘플 혈압 데이터 생성 완료',
            createdCount: result.count,
        });
    } catch (err) {
        console.error('POST /api/records/dev/seed-bp error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ✅ 상태별 혈압 통계: GET /api/records/stats/by-state?rangeDays=14
router.get('/stats/by-state', async (req, res) => {
    try {
        const rangeDays =
            typeof req.query.rangeDays === 'string'
                ? parseInt(req.query.rangeDays, 10) || 14
                : 14;

        const { list, now, fromDate } = await getRecentRecords(
            rangeDays,
            'blood_pressure'
        );

        const groups: Record<string, DbRecord[]> = {};
        for (const r of list) {
            const key = r.state || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        }

        const avg = (nums: number[]): number | null =>
            nums.length === 0
                ? null
                : nums.reduce((sum, v) => sum + v, 0) / nums.length;

        const statesStats = Object.entries(groups).map(([state, arr]) => {
            const sysValues = arr.map((r) => r.value1);
            const diaValues = arr
                .map((r) => r.value2)
                .filter((v): v is number => typeof v === 'number');

            return {
                state,
                count: arr.length,
                avg_sys: avg(sysValues),
                avg_dia: avg(diaValues),
            };
        });

        statesStats.sort((a, b) => a.state.localeCompare(b.state));

        return res.json({
            rangeDays,
            from: fromDate.toISOString(),
            to: now.toISOString(),
            totalCount: list.length,
            states: statesStats,
        });
    } catch (err) {
        console.error('GET /api/records/stats/by-state error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

// ✅ AI 코치용 요약: GET /api/records/ai/coach?rangeDays=14
router.get('/ai/coach', async (req, res) => {
    try {
        const rangeDays =
            typeof req.query.rangeDays === 'string'
                ? parseInt(req.query.rangeDays, 10) || 14
                : 14;

        const { list, now, fromDate } = await getRecentRecords(
            rangeDays,
            'blood_pressure'
        );
        const bpRecords = list;

        if (bpRecords.length === 0) {
            return res.json({
                rangeDays,
                from: fromDate.toISOString(),
                to: now.toISOString(),
                summaryLines: [
                    '최근 이 기간 동안 등록된 혈압 기록이 없어서 패턴을 분석할 수 없어요.',
                ],
                tips: [
                    '하루에 한 번이라도 일정한 시간에 혈압을 기록해 두면 나중에 패턴을 보기 좋아요.',
                    '이 내용은 참고용이며, 건강 상태에 대한 판단이나 치료 결정은 반드시 의료 전문가와 상의해야 합니다.',
                ],
            });
        }

        const avg = (nums: number[]): number | null =>
            nums.length === 0
                ? null
                : nums.reduce((sum, v) => sum + v, 0) / nums.length;

        const sysValues = bpRecords.map((r) => r.value1);
        const diaValues = bpRecords
            .map((r) => r.value2)
            .filter((v): v is number => typeof v === 'number');

        const overallSys = avg(sysValues);
        const overallDia = avg(diaValues);

        const groups: Record<string, DbRecord[]> = {};
        for (const r of bpRecords) {
            const key = r.state || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        }

        const stateStats = Object.entries(groups).map(([state, arr]) => {
            const sys = avg(arr.map((r) => r.value1));
            const dia = avg(
                arr
                    .map((r) => r.value2)
                    .filter((v): v is number => typeof v === 'number')
            );
            return {
                state,
                count: arr.length,
                avg_sys: sys,
                avg_dia: dia,
            };
        });

        const summaryLines: string[] = [];
        const tips: string[] = [];

        summaryLines.push(
            `최근 ${rangeDays}일 동안 기록된 혈압은 총 ${bpRecords.length}개예요.`
        );

        if (overallSys !== null && overallDia !== null) {
            summaryLines.push(
                `전체 수축기 평균은 약 ${Math.round(
                    overallSys
                )}mmHg, 이완기 평균은 약 ${Math.round(overallDia)}mmHg 입니다.`
            );
        }

        if (overallSys !== null) {
            stateStats
                .filter((s) => s.count >= 3 && s.avg_sys !== null)
                .forEach((s) => {
                    const diff = (s.avg_sys as number) - overallSys;
                    const diffAbs = Math.round(Math.abs(diff));
                    if (diffAbs >= 5) {
                        const label = stateLabel(s.state);
                        if (diff > 0) {
                            tips.push(
                                `${label}은(는) 전체 평균보다 수축기 혈압이 약 ${diffAbs}mmHg 정도 높게 나타나는 경향이 있어요.`
                            );
                        } else {
                            tips.push(
                                `${label}은(는) 전체 평균보다 수축기 혈압이 약 ${diffAbs}mmHg 정도 낮게 나타나는 경향이 있어요.`
                            );
                        }
                    }
                });
        }

        const stressStat = stateStats.find((s) => s.state === 'stress');
        if (
            stressStat &&
            stressStat.avg_sys !== null &&
            overallSys !== null &&
            stressStat.count >= 3
        ) {
            const diff = (stressStat.avg_sys as number) - overallSys;
            const diffAbs = Math.round(Math.abs(diff));
            if (diffAbs >= 3) {
                if (diff > 0) {
                    tips.push(
                        `스트레스를 느낄 때 측정한 혈압은 전체 평균보다 약 ${diffAbs}mmHg 높게 나타나요. 스트레스를 줄일 수 있는 루틴(휴식, 호흡, 산책 등)을 하나 정해서 시도해 보는 것도 도움이 될 수 있어요.`
                    );
                } else {
                    tips.push(
                        `스트레스를 느낀다고 표시된 기록에서 혈압이 오히려 평균보다 낮게 나타났어요. 표기 방식이나 상태 체크를 한 번 더 점검해보는 것도 좋아요.`
                    );
                }
            }
        }

        tips.push(
            '이 내용은 생활 패턴을 이해하기 위한 참고용 설명일 뿐이며, 진단이나 치료 지시는 아닙니다.',
            '혈압이 계속 높게 나오거나 몸 상태가 걱정된다면 반드시 의료 전문가와 상담하세요.'
        );

        return res.json({
            rangeDays,
            from: fromDate.toISOString(),
            to: now.toISOString(),
            summaryLines,
            tips,
            states: stateStats,
        });
    } catch (err) {
        console.error('GET /api/records/ai/coach error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
});

export default router;
