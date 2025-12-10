// app/insights/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:4000';

type Bucket = {
    count: number;
    avg_sys: number | null;
    avg_dia: number | null;
};

type LifestyleStatsResponse = {
    rangeDays: number;
    sleep: {
        short: Bucket;
        enough: Bucket;
    };
    exercise: {
        yes: Bucket;
        no: Bucket;
    };
    stress: {
        low: Bucket;
        mid: Bucket;
        high: Bucket;
    };
};

export default function InsightsPage() {
    const [stats, setStats] = useState<LifestyleStatsResponse | null>(null);
    const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async (days: number) => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE}/api/records/stats/lifestyle?rangeDays=${days}`,
            );
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const json = (await res.json()) as LifestyleStatsResponse;
            setStats(json);
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(rangeDays);
    }, [rangeDays]);

    const formatAvg = (b: Bucket) => {
        if (b.avg_sys == null || b.avg_dia == null) return '데이터 없음';
        return `${Math.round(b.avg_sys)} / ${Math.round(b.avg_dia)} mmHg`;
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📊 라이프스타일 인사이트</h1>
                        <p className="text-sm text-slate-300 mt-1">
                            최근 수면 시간, 운동 여부, 스트레스 수준에 따라 혈압 평균이 어떻게
                            달라지는지 요약해서 보여주는 페이지야.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Link
                            href="/"
                            className="text-sm text-slate-300 hover:text-slate-100 underline"
                        >
                            ← 대시보드로
                        </Link>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-300">분석 기간:</span>
                            <select
                                value={rangeDays}
                                onChange={(e) =>
                                    setRangeDays(Number(e.target.value) as 7 | 14 | 30)
                                }
                                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs"
                            >
                                <option value={7}>최근 7일</option>
                                <option value={14}>최근 14일</option>
                                <option value={30}>최근 30일</option>
                            </select>
                        </div>
                    </div>
                </header>

                {loading && <p>불러오는 중...</p>}
                {error && <p className="text-sm text-red-400">에러: {error}</p>}

                {!loading && !error && stats && (
                    <>
                        {/* 수면 인사이트 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <h2 className="font-semibold text-sm text-slate-200">
                                😴 수면 시간과 혈압
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        수면 &lt; 6시간인 날
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.sleep.short)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.sleep.short.count}개
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        수면 ≥ 6시간인 날
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.sleep.enough)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.sleep.enough.count}개
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300">
                                {stats.sleep.short.count > 0 &&
                                stats.sleep.enough.count > 0 &&
                                stats.sleep.short.avg_sys != null &&
                                stats.sleep.enough.avg_sys != null ? (
                                    (() => {
                                        const diffSys =
                                            stats.sleep.short.avg_sys - stats.sleep.enough.avg_sys;
                                        if (diffSys > 3) {
                                            return `수면 시간이 6시간 미만인 날의 수축기 혈압이, 6시간 이상 잔 날보다 평균 약 ${diffSys.toFixed(
                                                1,
                                            )} mmHg 높게 나타나고 있어요. 수면 시간을 조금만 늘려도 혈압 관리에 도움이 될 수 있어요.`;
                                        }
                                        if (diffSys < -3) {
                                            return `오히려 수면 시간이 긴 날의 혈압이 더 높게 나오는 경향이 있어요. 측정 시간대나 컨디션(예: 야근 후, 과음 등)도 함께 메모해두면 원인을 찾는 데 도움이 될 수 있어요.`;
                                        }
                                        return `수면 시간에 따른 평균 혈압 차이가 크지는 않지만, 꾸준히 기록을 쌓으면 더 뚜렷한 패턴이 보일 수 있어요.`;
                                    })()
                                ) : (
                                    '수면 시간이 함께 기록된 데이터가 아직 충분하지 않아요. 다음 측정 때 수면 시간도 같이 적어두면, 패턴을 더 잘 분석해 줄 수 있어요.'
                                )}
                            </p>
                        </section>

                        {/* 운동 인사이트 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <h2 className="font-semibold text-sm text-slate-200">
                                🏃‍♀️ 운동 여부와 혈압
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        운동한 날
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.exercise.yes)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.exercise.yes.count}개
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        운동하지 않은 날
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.exercise.no)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.exercise.no.count}개
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300">
                                {stats.exercise.yes.count > 0 &&
                                stats.exercise.no.count > 0 &&
                                stats.exercise.yes.avg_sys != null &&
                                stats.exercise.no.avg_sys != null ? (
                                    (() => {
                                        const diffSys =
                                            stats.exercise.no.avg_sys -
                                            stats.exercise.yes.avg_sys;
                                        if (diffSys > 3) {
                                            return `운동을 한 날의 평균 혈압이, 운동하지 않은 날보다 수축기 기준 약 ${diffSys.toFixed(
                                                1,
                                            )} mmHg 낮게 나타나고 있어요. 가볍게라도 규칙적인 운동을 유지하는 것이 혈압 관리에 꽤 도움이 되고 있는 것 같아요.`;
                                        }
                                        return `운동 여부에 따른 혈압 차이가 아직 크게 나타나지는 않아요. 운동 강도나 시간, 운동 직후 측정인지 여부도 함께 기록해 두면 더 정확한 패턴을 찾는 데 도움이 될 수 있어요.`;
                                    })()
                                ) : (
                                    '운동 여부 정보가 함께 기록된 데이터가 아직 적어요. 운동한 날에는 “운동했다”를 표시해 두면, 장기적으로 혈압과의 관계를 분석해 줄 수 있어요.'
                                )}
                            </p>
                        </section>

                        {/* 스트레스 인사이트 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <h2 className="font-semibold text-sm text-slate-200">
                                😮‍💨 스트레스와 혈압
                            </h2>
                            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        스트레스 낮음 (1~2)
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.stress.low)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.stress.low.count}개
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        스트레스 보통 (3)
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.stress.mid)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.stress.mid.count}개
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                                    <div className="text-xs text-slate-400 mb-1">
                                        스트레스 높음 (4~5)
                                    </div>
                                    <div className="font-semibold">
                                        {formatAvg(stats.stress.high)}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        기록 수: {stats.stress.high.count}개
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-300">
                                {stats.stress.low.count > 0 &&
                                stats.stress.high.count > 0 &&
                                stats.stress.low.avg_sys != null &&
                                stats.stress.high.avg_sys != null ? (
                                    (() => {
                                        const diffSys =
                                            stats.stress.high.avg_sys - stats.stress.low.avg_sys;
                                        if (diffSys > 3) {
                                            return `스트레스가 높은 날(4~5)의 혈압이, 낮은 날(1~2)보다 수축기 기준 약 ${diffSys.toFixed(
                                                1,
                                            )} mmHg 높게 나타나고 있어요. 스트레스 관리가 혈압에도 직접적인 영향을 주고 있는 것 같아요. 힘든 날에는 짧은 휴식, 산책, 호흡 운동 등을 일부러 넣어보는 것도 도움이 될 수 있어요.`;
                                        }
                                        return `스트레스 점수에 따른 혈압 차이가 아직 크게 나타나지는 않아요. 그래도 “어떤 일이 있었던 날인지” 메모를 남겨두면, 나중에 감정 패턴과 혈압을 같이 돌아보는 데 도움이 돼요.`;
                                    })()
                                ) : (
                                    '스트레스 수준이 함께 기록된 데이터가 아직 많지 않아요. 간단히 1~5 중 숫자만 남겨두어도, 장기적으로 혈압과의 관계를 분석하는 데 큰 도움이 돼요.'
                                )}
                            </p>

                            <p className="text-[11px] text-slate-500 mt-2">
                                ※ 이 인사이트는 참고용 정보이며, 의료적 진단이나 치료 지시가
                                아닙니다. 수치가 계속 걱정되거나 불편한 증상이 있다면 반드시
                                의료 전문가와 상담해 주세요.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
