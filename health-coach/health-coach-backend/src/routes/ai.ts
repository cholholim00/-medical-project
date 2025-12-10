// src/routes/ai.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { openai } from '../lib/openai';

const router = Router();

// 지금은 로그인 없으니까 고정 유저
const FIXED_USER_ID = 1;

function calcAvg(nums: number[]): number | null {
    if (!nums.length) return null;
    const sum = nums.reduce((acc, n) => acc + n, 0);
    return sum / nums.length;
}

router.post('/coach', async (req, res) => {
    try {
        const rangeDaysRaw = req.body?.rangeDays;
        const rangeDays =
            typeof rangeDaysRaw === 'number' && rangeDaysRaw > 0 ? rangeDaysRaw : 7;

        const userNoteRaw = req.body?.userNote;
        const userNote =
            typeof userNoteRaw === 'string' && userNoteRaw.trim().length > 0
                ? userNoteRaw.trim()
                : null;

        const now = new Date();
        const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        // 1) 최근 N일 혈압 기록
        const bpRecords = await prisma.healthRecord.findMany({
            where: {
                userId: FIXED_USER_ID,
                type: 'blood_pressure',
                datetime: { gte: from },
            },
            orderBy: { datetime: 'asc' },
        });

        const count = bpRecords.length;
        const sysList = bpRecords.map((r) => r.value1);
        const diaList = bpRecords
            .map((r) => r.value2)
            .filter((v): v is number => typeof v === 'number');

        const avgSys = calcAvg(sysList);
        const avgDia = calcAvg(diaList);

        // 2) 가장 최근 혈압 기록
        const latest = await prisma.healthRecord.findFirst({
            where: { userId: FIXED_USER_ID, type: 'blood_pressure' },
            orderBy: { datetime: 'desc' },
        });

        // 3) 목표 혈압
        const profile = await prisma.userProfile.findFirst({
            where: { userId: FIXED_USER_ID },
        });

        // ---------- 프롬프트용 텍스트 만들기 ----------
        const lines: string[] = [];

        lines.push(
            `다음은 한 사용자의 혈압 측정 요약 데이터야. 이 데이터를 참고해서 사용자가 최근 상태를 이해하고 생활 습관을 점검해 볼 수 있도록, 가벼운 조언을 해줘.`
        );

        lines.push('');
        lines.push(`[1] 최근 혈압 요약 (최근 ${rangeDays}일 기준)`);

        if (count === 0) {
            lines.push(
                `- 최근 ${rangeDays}일 동안 저장된 혈압 기록이 거의 없어서 평균을 계산하기 어렵거나 의미가 약해.`
            );
        } else {
            lines.push(`- 측정 횟수: ${count}회`);

            if (avgSys !== null && avgDia !== null) {
                lines.push(
                    `- 평균 혈압: 대략 ${avgSys.toFixed(1)} / ${avgDia.toFixed(
                        1
                    )} mmHg 정도야.`
                );
            } else if (avgSys !== null) {
                lines.push(
                    `- 수축기 평균: 약 ${avgSys.toFixed(
                        1
                    )} mmHg (이완기 값은 충분하지 않음)`
                );
            } else {
                lines.push(
                    `- 평균 혈압을 계산할 수 있을 만큼 데이터가 충분하지 않아.`
                );
            }
        }

        lines.push('');
        lines.push('[2] 가장 최근 측정값');

        if (latest) {
            const d = new Date(latest.datetime);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                '0'
            )}-${String(d.getDate()).padStart(2, '0')} ${String(
                d.getHours()
            ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

            lines.push(
                `- 최근 혈압: ${latest.value1}${
                    typeof latest.value2 === 'number' ? ` / ${latest.value2}` : ''
                } mmHg`
            );
            lines.push(`- 최근 측정 시각: ${dateStr}`);
            lines.push(
                `- 상태 라벨: ${
                    latest.state ? `"${latest.state}"` : '별도 상태 라벨 없음'
                }`
            );
            lines.push(
                `- 메모: ${
                    latest.memo && latest.memo.trim().length > 0
                        ? `"${latest.memo.trim()}"`
                        : '메모 없음'
                }`
            );
        } else {
            lines.push('- 아직 저장된 혈압 기록이 없어.');
        }

        lines.push('');
        lines.push('[3] 사용자가 설정한 목표 혈압');

        if (profile) {
            lines.push(
                `- 사용자가 설정한 목표 혈압: ${profile.targetSys} / ${profile.targetDia} mmHg`
            );
        } else {
            lines.push(
                '- 사용자가 별도의 목표 혈압을 저장하지 않았어. 일반적으로 120 / 80 mmHg 정도를 많이 기준으로 사용하긴 해.'
            );
        }

        // ✅ [4] 사용자가 적은 "현재 상태 메모"
        lines.push('');
        lines.push('[4] 사용자가 직접 적은 현재 상태 / 고민 내용');

        if (userNote) {
            lines.push(`- 사용자의 메모(그대로 인용): "${userNote}"`);
            lines.push(
                '- 위 메모 내용은 사용자가 스스로 적은 주관적인 느낌이니, 너무 비판하지 말고 공감하면서 조언해 줘.'
            );
        } else {
            lines.push('- 사용자가 별도의 메모를 남기지 않았어.');
        }

        // ✅ [5] 코멘트 스타일 요청
        lines.push('');
        lines.push('[5] 코멘트 스타일 요청');

        lines.push(
            '- 이 데이터는 참고용이야. 너는 의사가 아니라, 생활 습관을 같이 돌아봐 주는 코치라고 생각해줘.'
        );
        lines.push(
            '- 혈압이 높아 보이더라도, 직접적인 진단이나 약 복용 권유는 하지 말고, "걱정되는 수치가 계속되면 의료진과 상담해 보세요" 정도로만 안내해 줘.'
        );
        lines.push(
            '- 전체 분량은 3~6문장 정도의 문단 2개 안팎이면 좋겠어. 너무 길게 적지 말아줘.'
        );
        lines.push(
            '- 말투는 부드럽고 존댓말로, 사용자를 격려하면서 너무 죄책감을 느끼지 않도록 말해줘.'
        );

        const userContent = lines.join('\n');

        // ---------- OpenAI 호출 ----------
        const response = await openai.responses.create({
            model: 'gpt-4.1-mini',
            instructions:
                '너는 혈압과 생활 습관 데이터를 함께 살펴보는 "AI 혈압 코치"야. 한국어 존댓말로, 부드럽고 현실적인 조언을 해줘. 의료 진단이나 치료 지시 대신, 생활 습관을 조금씩 조정해 볼 수 있는 방향을 제안해 줘.',
            input: userContent,
            max_output_tokens: 400,
        });

        const message =
            (response as any).output_text ??
            'AI 코치 메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';

        await prisma.aiCoachLog.create({
            data: {
                userId: FIXED_USER_ID,
                type: 'coach',
                rangeDays,
                userNote: userNote ?? null,
                source: 'web-dashboard',
                aiMessage: message,
            },
        });

        return res.json({
            message,
            meta: {
                model: response.model,
                createdAt: new Date().toISOString(),
                rangeDays,
                recordCount: count,
                hasUserNote: !!userNote,
            },
        });
    } catch (error) {
        console.error('POST /api/ai/coach error', error);
        return res
            .status(500)
            .json({ error: 'AI 코치 메시지 생성 중 오류가 발생했습니다.' });
    }
});

// AI 코치 히스토리 조회
// GET /api/ai/history?limit=20
router.get('/history', async (req, res) => {
    try {
        const limitRaw = req.query.limit as string | undefined;
        const limit =
            limitRaw && !Number.isNaN(Number(limitRaw))
                ? Math.min(Number(limitRaw), 100)
                : 20;

        const logs = await prisma.aiCoachLog.findMany({
            where: { userId: FIXED_USER_ID },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return res.json(logs);
    } catch (error) {
        console.error('GET /api/ai/history error', error);
        return res
            .status(500)
            .json({ error: 'AI 코칭 히스토리를 불러오는 중 오류가 발생했습니다.' });
    }
});


// 라이프스타일 인사이트 분석용 AI 코치
// POST /api/ai/lifestyle  { rangeDays?: number }
router.post('/lifestyle', async (req, res) => {
    try {
        const rangeDaysRaw = req.body?.rangeDays;
        const rangeDays =
            typeof rangeDaysRaw === 'number' && rangeDaysRaw > 0
                ? Math.min(rangeDaysRaw, 90)
                : 30; // 기본 30일

        const now = new Date();
        const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

        // 최근 N일 혈압 + 라이프스타일 정보 가져오기
        const records = await prisma.healthRecord.findMany({
            where: {
                userId: FIXED_USER_ID,
                type: 'blood_pressure',
                datetime: { gte: from },
            },
            orderBy: { datetime: 'asc' },
        });

        if (records.length === 0) {
            return res.status(400).json({
                error:
                    `최근 ${rangeDays}일 동안 혈압 기록이 없어서 라이프스타일 인사이트를 계산할 수 없습니다.`,
            });
        }

        type GroupStats = {
            count: number;
            avg_sys: number | null;
            avg_dia: number | null;
        };

        const makeStats = (list: typeof records): GroupStats => {
            const sys = list.map((r) => r.value1);
            const dia = list
                .map((r) => r.value2)
                .filter((v): v is number => typeof v === 'number');
            return {
                count: list.length,
                avg_sys: calcAvg(sys),
                avg_dia: calcAvg(dia),
            };
        };

        // 수면 (<6h vs >=6h)
        const sleepShort = records.filter(
            (r) => typeof r.sleepHours === 'number' && r.sleepHours! < 6,
        );
        const sleepEnough = records.filter(
            (r) => typeof r.sleepHours === 'number' && r.sleepHours! >= 6,
        );

        const sleepStats = {
            short: makeStats(sleepShort),
            enough: makeStats(sleepEnough),
        };

        // 운동 (true vs false)
        const exerciseYes = records.filter((r) => r.exercise === true);
        const exerciseNo = records.filter((r) => r.exercise === false);

        const exerciseStats = {
            yes: makeStats(exerciseYes),
            no: makeStats(exerciseNo),
        };

        // 스트레스 (1~2 low, 3 mid, 4~5 high)
        const stressLow = records.filter(
            (r) =>
                typeof r.stressLevel === 'number' &&
                r.stressLevel! >= 1 &&
                r.stressLevel! <= 2,
        );
        const stressMid = records.filter(
            (r) => typeof r.stressLevel === 'number' && r.stressLevel === 3,
        );
        const stressHigh = records.filter(
            (r) =>
                typeof r.stressLevel === 'number' &&
                r.stressLevel! >= 4 &&
                r.stressLevel! <= 5,
        );

        const stressStats = {
            low: makeStats(stressLow),
            mid: makeStats(stressMid),
            high: makeStats(stressHigh),
        };

        // -------- 프롬프트용 텍스트 만들기 --------
        const lines: string[] = [];

        lines.push(
            `다음은 한 사용자의 혈압과 라이프스타일(수면, 운동, 스트레스) 통계야.`,
        );
        lines.push(
            `통계만 보고 "경향"이나 "가능성" 정도를 조심스럽게 이야기해주고, 너무 단정적으로 말하지는 말아줘.`,
        );
        lines.push('');
        lines.push(`분석 기간: 최근 ${rangeDays}일`);

        const fmt = (v: number | null) =>
            v === null ? 'N/A' : v.toFixed(1);

        // 수면
        lines.push('');
        lines.push('[1] 수면 시간에 따른 혈압 차이');
        lines.push(
            `- 6시간 미만 수면 그룹: 측정 ${sleepStats.short.count}회, 평균 혈압 약 ${fmt(
                sleepStats.short.avg_sys,
            )} / ${fmt(sleepStats.short.avg_dia)} mmHg`,
        );
        lines.push(
            `- 6시간 이상 수면 그룹: 측정 ${sleepStats.enough.count}회, 평균 혈압 약 ${fmt(
                sleepStats.enough.avg_sys,
            )} / ${fmt(sleepStats.enough.avg_dia)} mmHg`,
        );

        // 운동
        lines.push('');
        lines.push('[2] 운동 여부에 따른 혈압 차이');
        lines.push(
            `- 운동한 날로 기록된 그룹: 측정 ${exerciseStats.yes.count}회, 평균 혈압 약 ${fmt(
                exerciseStats.yes.avg_sys,
            )} / ${fmt(exerciseStats.yes.avg_dia)} mmHg`,
        );
        lines.push(
            `- 운동하지 않은 날로 기록된 그룹: 측정 ${
                exerciseStats.no.count
            }회, 평균 혈압 약 ${fmt(exerciseStats.no.avg_sys)} / ${fmt(
                exerciseStats.no.avg_dia,
            )} mmHg`,
        );

        // 스트레스
        lines.push('');
        lines.push('[3] 스트레스 수준에 따른 혈압 차이');
        lines.push(
            `- 스트레스 낮음(1~2): 측정 ${stressStats.low.count}회, 평균 혈압 약 ${fmt(
                stressStats.low.avg_sys,
            )} / ${fmt(stressStats.low.avg_dia)} mmHg`,
        );
        lines.push(
            `- 스트레스 중간(3): 측정 ${stressStats.mid.count}회, 평균 혈압 약 ${fmt(
                stressStats.mid.avg_sys,
            )} / ${fmt(stressStats.mid.avg_dia)} mmHg`,
        );
        lines.push(
            `- 스트레스 높음(4~5): 측정 ${stressStats.high.count}회, 평균 혈압 약 ${fmt(
                stressStats.high.avg_sys,
            )} / ${fmt(stressStats.high.avg_dia)} mmHg`,
        );

        lines.push('');
        lines.push('[4] 코멘트 스타일 가이드');
        lines.push(
            '- 이 데이터는 표본 수가 많지 않을 수 있으니, 가볍게 경향을 짚어주고, 반드시 맞다고 단정짓지 말아줘.',
        );
        lines.push(
            '- 예를 들어 "이 데이터만 보면, 수면 시간이 짧을수록 혈압이 살짝 높게 나타나는 경향이 있어 보입니다" 정도의 톤이면 좋아.',
        );
        lines.push(
            '- 항상 마지막에는 "이 결과는 참고용이고, 실제 건강 상태는 의료 전문가와 상담하는 것이 가장 안전합니다" 같은 문장을 덧붙여줘.',
        );
        lines.push(
            '- 전체 분량은 2~4문단, 6~10문장 정도면 충분해. 너무 길게 설명하지 말아줘.',
        );

        const prompt = lines.join('\n');

        const response = await openai.responses.create({
            model: 'gpt-4.1-mini',
            instructions:
                '너는 혈압과 생활 습관 데이터를 같이 보는 건강 코치야. 한국어 존댓말로 부드럽게 설명해줘.',
            input: prompt,
            max_output_tokens: 450,
        });

        const message =
            (response as any).output_text ??
            'AI 인사이트 메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';

        await prisma.aiCoachLog.create({
            data: {
                userId: FIXED_USER_ID,
                type: 'lifestyle',
                rangeDays,
                userNote: null,
                source: 'web-dashboard',
                aiMessage: message,
            },
        });

        return res.json({
            message,
            rangeDays,
            stats: {
                sleep: sleepStats,
                exercise: exerciseStats,
                stress: stressStats,
            },
        });
    } catch (error) {
        console.error('POST /api/ai/lifestyle error', error);
        return res
            .status(500)
            .json({ error: '라이프스타일 인사이트 AI 메시지 생성 중 오류가 발생했습니다.' });
    }
});

export default router;
