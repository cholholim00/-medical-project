// app/ai-coach/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:4000';

type SummaryResponse = {
    rangeDays: number;
    blood_sugar: {
        count: number;
        avg: number | null;
    };
    blood_pressure: {
        count: number;
        avg_sys: number | null;
        avg_dia: number | null;
    };
};

type HealthRecord = {
    id: number;
    datetime: string;
    type: 'blood_sugar' | 'blood_pressure';
    value1: number;
    value2?: number | null;
    state?: string | null;
    memo?: string | null;
    sleepHours?: number | null;
    exercise?: boolean | null;
    stressLevel?: number | null;
};

type UserProfile = {
    id: number;
    userId: number;
    targetSys: number;
    targetDia: number;
};

type Level = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'unknown';

function classifyBloodPressure(sys: number | null, dia: number | null): Level {
    if (sys == null || dia == null) return 'unknown';

    if (sys < 120 && dia < 80) return 'normal';
    if (sys >= 120 && sys <= 129 && dia < 80) return 'elevated';
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'stage1';
    if (sys >= 140 || dia >= 90) return 'stage2';

    return 'unknown';
}

function levelText(level: Level): string {
    switch (level) {
        case 'normal':
            return '정상 범위';
        case 'elevated':
            return '주의 (상승)';
        case 'stage1':
            return '고혈압 1단계 의심';
        case 'stage2':
            return '고혈압 2단계 의심';
        default:
            return '분류 불가';
    }
}

function levelColor(level: Level): string {
    switch (level) {
        case 'normal':
            return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60';
        case 'elevated':
            return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60';
        case 'stage1':
            return 'bg-orange-500/20 text-orange-300 border-orange-500/60';
        case 'stage2':
            return 'bg-red-500/20 text-red-300 border-red-500/60';
        default:
            return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
}

export default function AICoachPage() {
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [latest, setLatest] = useState<HealthRecord | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [summaryRes, recordsRes, profileRes] = await Promise.all([
                fetch(`${API_BASE}/api/records/stats/summary?rangeDays=7`),
                fetch(`${API_BASE}/api/records?type=blood_pressure`),
                fetch(`${API_BASE}/api/user/profile`),
            ]);

            if (!summaryRes.ok) {
                throw new Error(`summary API error: ${summaryRes.status}`);
            }
            if (!recordsRes.ok) {
                throw new Error(`records API error: ${recordsRes.status}`);
            }

            const summaryJson = (await summaryRes.json()) as SummaryResponse;
            const recordsJson = (await recordsRes.json()) as HealthRecord[];

            // 가장 최근 혈압 기록 (datetime 기준 내림차순)
            const sorted = [...recordsJson].sort(
                (a, b) =>
                    new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
            );
            const latestRecord = sorted.length > 0 ? sorted[0] : null;

            let profileJson: UserProfile | null = null;
            if (profileRes.ok) {
                // 404면 "아직 프로필 없음"이니까 무시
                profileJson = (await profileRes.json()) as UserProfile;
            }

            setSummary(summaryJson);
            setLatest(latestRecord);
            setProfile(profileJson);
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const latestSys =
        latest && typeof latest.value1 === 'number' ? latest.value1 : null;
    const latestDia =
        latest && typeof latest.value2 === 'number' ? latest.value2 : null;
    const latestLevel = classifyBloodPressure(latestSys, latestDia);

    const coachMessages = useMemo(() => {
        const msgs: string[] = [];

        if (!latest || !summary) {
            msgs.push(
                '아직 분석할 수 있는 데이터가 충분하지 않아요. 최소 며칠 이상 혈압을 꾸준히 기록해 주면 패턴을 더 잘 알려줄게요.',
            );
            return msgs;
        }

        // 1) 최근 측정값에 대한 한 줄 평가
        if (latestLevel === 'normal') {
            msgs.push(
                `가장 최근 혈압은 ${latestSys} / ${latestDia} mmHg 로, 일반적인 기준에서 “정상 범위”에 가까워요. 이 상태를 유지할 수 있도록 지금의 생활 패턴을 기록으로 남겨두면 좋아요.`,
            );
        } else if (latestLevel === 'elevated') {
            msgs.push(
                `가장 최근 혈압은 ${latestSys} / ${latestDia} mmHg 로, “주의 (상승)” 범위에 있어요. 당장 위험 수준은 아니지만, 카페인·나트륨 섭취와 스트레스 관리에 조금 더 신경 쓰면 좋겠어요.`,
            );
        } else if (latestLevel === 'stage1') {
            msgs.push(
                `가장 최근 혈압은 ${latestSys} / ${latestDia} mmHg 로, “고혈압 1단계 의심” 범위에 있어요. 반복해서 이런 수치가 나온다면, 생활습관 점검과 함께 의료진과 상의하는 것을 권장해요.`,
            );
        } else if (latestLevel === 'stage2') {
            msgs.push(
                `가장 최근 혈압은 ${latestSys} / ${latestDia} mmHg 로, “고혈압 2단계 의심” 범위입니다. 이런 수치가 자주 나오면 반드시 의료 전문가와 상담이 필요해요.`,
            );
        }

        // 2) 목표혈압과 비교
        if (profile && latestSys !== null && latestDia !== null) {
            const sysGap = latestSys - profile.targetSys;
            const diaGap = latestDia - profile.targetDia;

            if (sysGap <= 5 && diaGap <= 5) {
                msgs.push(
                    `설정한 목표 혈압(${profile.targetSys} / ${profile.targetDia} mmHg)에 거의 근접해 있어요. 지금 패턴을 유지하면서, 기록에 수면·운동·스트레스도 함께 남겨두면 “어떤 날에 목표에 가깝게 되는지” 더 잘 분석할 수 있어요.`,
                );
            } else if (sysGap > 0 || diaGap > 0) {
                msgs.push(
                    `현재 혈압은 목표(${profile.targetSys} / ${profile.targetDia} mmHg)보다 다소 높은 편이에요. 특히 수축기 기준으로 약 ${sysGap} mmHg 정도 차이가 나요. 저녁 늦은 시간의 야식, 카페인, 스트레스 강도 등을 기록하면서 어떤 요인에서 수치가 올라가는지 같이 찾아보면 좋아요.`,
                );
            } else {
                msgs.push(
                    `현재 혈압은 목표(${profile.targetSys} / ${profile.targetDia} mmHg)보다 더 낮은 편이에요. 너무 낮아서 어지러움이 있다면 의료진과 상의해 주세요.`,
                );
            }
        } else {
            msgs.push(
                '아직 목표 혈압이 설정되어 있지 않아요. 설정 페이지에서 본인이 유지하고 싶은 목표 혈압을 지정해 두면, 그 기준으로 매일 상태를 비교해 줄 수 있어요.',
            );
        }

        // 3) 최근 7일 평균에 대한 코멘트
        if (summary.blood_pressure.avg_sys != null && summary.blood_pressure.avg_dia != null) {
            msgs.push(
                `최근 ${summary.rangeDays}일 동안 평균 혈압은 약 ${Math.round(
                    summary.blood_pressure.avg_sys,
                )} / ${Math.round(
                    summary.blood_pressure.avg_dia,
                )} mmHg 입니다. 하루치 수치보다는 이런 “기간 평균”을 같이 보면서, 갑자기 튀는 날이 언제인지 체크해 보면 좋아요.`,
            );
        }

        // 4) 라이프스타일 힌트 (있으면)
        if (latest.sleepHours != null) {
            if (latest.sleepHours < 6) {
                msgs.push(
                    `최근 기록에서 수면 시간이 약 ${latest.sleepHours}시간으로 짧게 나타났어요. 수면 부족은 혈압과 스트레스 모두에 영향을 줄 수 있어서, 가능하다면 하루 6~7시간 이상 수면을 목표로 해보는 것도 좋아요.`,
                );
            } else {
                msgs.push(
                    `수면 시간이 약 ${latest.sleepHours}시간으로 기록되어 있어요. 규칙적인 수면은 혈압 관리에 큰 도움이 됩니다. 비슷한 시간대에 자고 일어나는 패턴을 유지해보는 것도 좋겠어요.`,
                );
            }
        }

        if (latest.stressLevel != null) {
            if (latest.stressLevel >= 4) {
                msgs.push(
                    `오늘 스트레스 수준을 ${latest.stressLevel}/5 로 기록했네요. 스트레스가 높은 날은 혈압이 일시적으로 올라가기 쉬워요. 짧은 산책, 호흡 운동, 좋아하는 취미 시간 등을 일부러 넣어보는 것도 좋은 방법이에요.`,
                );
            } else if (latest.stressLevel <= 2) {
                msgs.push(
                    `오늘 스트레스 수준을 ${latest.stressLevel}/5 로 기록했어요. 비교적 안정적인 날이네요. 이런 날의 수면·식사·활동 패턴을 기억해 두면, 나중에 힘든 날과 비교할 때 도움이 돼요.`,
                );
            }
        }

        if (latest.exercise != null) {
            if (latest.exercise) {
                msgs.push(
                    '오늘 운동을 한 것으로 기록되어 있어요. 가벼운 유산소 운동은 혈압 관리에 큰 도움이 됩니다. 다만 무리한 근력 운동은 순간 혈압을 올릴 수 있으니, 본인 컨디션에 맞는 강도로 조절해 주세요.',
                );
            } else {
                msgs.push(
                    '오늘은 운동을 하지 않은 날로 기록되어 있어요. 가벼운 걷기 20~30분 정도만 추가해도 혈압과 기분 관리에 도움이 될 수 있어요.',
                );
            }
        }

        return msgs;
    }, [latest, summary, profile, latestLevel, latestSys, latestDia]);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-4xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">🤖 AI 혈압 코치 요약</h1>
                        <p className="text-sm text-slate-300 mt-1">
                            최근 혈압 기록, 목표 범위, 라이프스타일 정보를 함께 보고
                            코멘트를 만들어주는 요약 페이지야.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="text-sm text-slate-300 hover:text-slate-100 underline"
                    >
                        ← 대시보드로 돌아가기
                    </Link>
                </header>

                {loading && <p>불러오는 중...</p>}
                {error && (
                    <p className="text-sm text-red-400">
                        에러: {error}
                    </p>
                )}

                {!loading && !error && (
                    <>
                        {/* 상단 카드: 최근 혈압 + 목표 + 분류 */}
                        <section className="grid md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                <h2 className="font-semibold text-sm mb-1">
                                    최근 혈압 요약
                                </h2>
                                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                                    <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      가장 최근 혈압
                    </span>
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${levelColor(
                                                latestLevel,
                                            )}`}
                                        >
                      {latest ? levelText(latestLevel) : '기록 없음'}
                    </span>
                                    </div>
                                    <div className="text-lg font-bold">
                                        {latestSys !== null && latestDia !== null
                                            ? `${latestSys} / ${latestDia} mmHg`
                                            : '기록 없음'}
                                    </div>
                                    {latest && (
                                        <p className="text-xs text-slate-400">
                                            상태:{' '}
                                            <span className="font-medium text-slate-200">
                        {latest.state ?? '표시 없음'}
                      </span>
                                        </p>
                                    )}
                                </div>

                                {summary && (
                                    <div className="text-xs text-slate-300 space-y-1">
                                        <p>
                                            최근 {summary.rangeDays}일 평균 혈압:{' '}
                                            {summary.blood_pressure.avg_sys != null &&
                                            summary.blood_pressure.avg_dia != null
                                                ? `${Math.round(
                                                    summary.blood_pressure.avg_sys,
                                                )} / ${Math.round(
                                                    summary.blood_pressure.avg_dia,
                                                )} mmHg`
                                                : '데이터 없음'}
                                        </p>
                                        <p>
                                            측정 횟수: {summary.blood_pressure.count}회
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                <h2 className="font-semibold text-sm">
                                    목표 혈압 & 라이프스타일
                                </h2>
                                <div className="text-sm text-slate-300 space-y-2">
                                    {profile ? (
                                        <p>
                                            현재 설정된 목표 혈압은{' '}
                                            <span className="font-semibold">
                        {profile.targetSys} / {profile.targetDia} mmHg
                      </span>{' '}
                                            입니다.
                                        </p>
                                    ) : (
                                        <p>
                                            아직 목표 혈압이 설정되어 있지 않아요.{' '}
                                            <Link
                                                href="/settings"
                                                className="underline text-sky-400"
                                            >
                                                목표 혈압 설정 페이지
                                            </Link>
                                            에서 본인이 유지하고 싶은 범위를 설정해 두면, 이 페이지에서
                                            그 기준으로 비교해 줄게요.
                                        </p>
                                    )}

                                    {latest && (
                                        <ul className="text-xs text-slate-400 space-y-1">
                                            {latest.sleepHours != null && (
                                                <li>・수면 시간: 약 {latest.sleepHours}시간</li>
                                            )}
                                            {latest.exercise != null && (
                                                <li>
                                                    ・운동 여부:{' '}
                                                    {latest.exercise ? '오늘 운동함' : '오늘 운동 안 함'}
                                                </li>
                                            )}
                                            {latest.stressLevel != null && (
                                                <li>
                                                    ・스트레스 수준: {latest.stressLevel}/5
                                                </li>
                                            )}
                                            {!latest.sleepHours &&
                                                latest.exercise == null &&
                                                latest.stressLevel == null && (
                                                    <li>
                                                        ・아직 수면/운동/스트레스 정보는 기록되지 않았어요.
                                                        다음 측정 때 함께 남겨두면, 패턴 분석에 더 도움이 돼요.
                                                    </li>
                                                )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* 하단: AI 코치 메시지 리스트 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-sm">
                                    오늘의 코치 코멘트
                                </h2>
                                <button
                                    onClick={fetchData}
                                    className="text-xs px-3 py-1 rounded-lg border border-slate-600 bg-slate-950 hover:bg-slate-800"
                                >
                                    🔄 새로 분석하기
                                </button>
                            </div>

                            {coachMessages.length === 0 ? (
                                <p className="text-sm text-slate-400">
                                    아직 보여줄 코멘트가 없어요. 혈압을 몇 번 더 기록해 주면,
                                    패턴을 분석해서 여기에서 알려줄게요.
                                </p>
                            ) : (
                                <ul className="space-y-2 text-sm text-slate-200">
                                    {coachMessages.map((msg, idx) => (
                                        <li
                                            key={idx}
                                            className="p-3 rounded-lg bg-slate-950/70 border border-slate-800"
                                        >
                                            {msg}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <p className="text-[11px] text-slate-500 mt-2">
                                ※ 이 코멘트는 일반적인 건강 정보와 패턴 분석을 바탕으로 한 참고용
                                조언이에요. 진단이나 치료 지시는 아니며, 걱정되는 수치가 계속된다면
                                반드시 의료 전문가와 상담해 주세요.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
