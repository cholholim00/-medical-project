// app/insights/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:5001'; // 👉 백엔드 포트에 맞게 조정 (4000이면 4000)

type GroupStats = {
    count: number;
    avg_sys: number | null;
    avg_dia: number | null;
};

type LifestyleStats = {
    rangeDays: number;
    sleep: {
        short: GroupStats;
        enough: GroupStats;
    };
    exercise: {
        yes: GroupStats;
        no: GroupStats;
    };
    stress: {
        low: GroupStats;
        mid: GroupStats;
        high: GroupStats;
    };
};

export default function InsightsPage() {
    const [rangeDays, setRangeDays] = useState<14 | 30>(30);
    const [stats, setStats] = useState<LifestyleStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const fmt = (v: number | null) => (v === null ? '-' : Math.round(v));

    const fetchStats = async (days: number) => {
        try {
            setLoadingStats(true);
            setStatsError(null);

            const res = await fetch(
                `${API_BASE}/api/records/stats/lifestyle?rangeDays=${days}`,
            );

            if (!res.ok) {
                throw new Error(`lifestyle API error: ${res.status}`);
            }

            const json = (await res.json()) as LifestyleStats;
            setStats(json);
        } catch (err: any) {
            setStatsError(err.message ?? '라이프스타일 통계를 불러오는 중 오류가 발생했습니다.');
            setStats(null);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchStats(rangeDays);
    }, [rangeDays]);

    const handleAskAi = async () => {
        try {
            setAiLoading(true);
            setAiError(null);
            setAiMessage(null);

            const res = await fetch(`${API_BASE}/api/ai/lifestyle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rangeDays }),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `AI lifestyle API error: ${res.status}`);
            }

            const json = await res.json();
            setAiMessage(json.message ?? '');
        } catch (err: any) {
            setAiError(
                err.message ?? 'AI 라이프스타일 인사이트를 불러오는 중 오류가 발생했습니다.',
            );
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📊 라이프스타일 인사이트</h1>
                        <p className="text-sm text-slate-300">
                            수면, 운동, 스트레스와 혈압 사이의 패턴을 숫자로 보고,
                            AI 코치의 해석까지 한 번에 확인할 수 있는 페이지야.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
                        >
                            🏠 대시보드로 돌아가기
                        </Link>
                        <Link
                            href="/ai-coach"
                            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
                        >
                            🤖 AI 혈압 코치
                        </Link>
                    </div>
                </header>

                {/* 기간 선택 + AI 버튼 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm text-slate-200 font-semibold">
                            분석 기간
                        </p>
                        <p className="text-xs text-slate-400">
                            기간을 바꾸면 같은 기준으로 다시 통계를 계산해서 보여줘.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={rangeDays}
                            onChange={(e) =>
                                setRangeDays(Number(e.target.value) as 14 | 30)
                            }
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                        >
                            <option value={14}>최근 14일</option>
                            <option value={30}>최근 30일</option>
                        </select>
                        <button
                            onClick={handleAskAi}
                            disabled={aiLoading}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold disabled:opacity-60"
                        >
                            {aiLoading ? 'AI 분석 중...' : '🧠 AI 인사이트 받기'}
                        </button>
                    </div>
                </section>

                {/* 통계 테이블 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <h2 className="font-semibold text-sm mb-1">
                        수면 / 운동 / 스트레스별 평균 혈압
                    </h2>

                    {loadingStats && (
                        <p className="text-sm text-slate-400">통계를 불러오는 중...</p>
                    )}
                    {statsError && (
                        <p className="text-sm text-red-400">에러: {statsError}</p>
                    )}

                    {!loadingStats && !statsError && stats && (
                        <div className="space-y-4 text-sm">
                            {/* 수면 */}
                            <div>
                                <h3 className="font-semibold text-slate-200 mb-1">
                                    😴 수면 시간
                                </h3>
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                    <tr className="bg-slate-800">
                                        <th className="border border-slate-700 px-2 py-1 text-left">
                                            그룹
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            측정 횟수
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            평균 혈압
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            6시간 미만
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.sleep.short.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.sleep.short.avg_sys)} /{' '}
                                            {fmt(stats.sleep.short.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            6시간 이상
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.sleep.enough.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.sleep.enough.avg_sys)} /{' '}
                                            {fmt(stats.sleep.enough.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 운동 */}
                            <div>
                                <h3 className="font-semibold text-slate-200 mb-1">
                                    🏃‍♀️ 운동 여부
                                </h3>
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                    <tr className="bg-slate-800">
                                        <th className="border border-slate-700 px-2 py-1 text-left">
                                            그룹
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            측정 횟수
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            평균 혈압
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            운동한 날
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.exercise.yes.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.exercise.yes.avg_sys)} /{' '}
                                            {fmt(stats.exercise.yes.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            운동 안 한 날
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.exercise.no.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.exercise.no.avg_sys)} /{' '}
                                            {fmt(stats.exercise.no.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 스트레스 */}
                            <div>
                                <h3 className="font-semibold text-slate-200 mb-1">
                                    😵‍💫 스트레스 수준
                                </h3>
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                    <tr className="bg-slate-800">
                                        <th className="border border-slate-700 px-2 py-1 text-left">
                                            그룹
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            측정 횟수
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            평균 혈압
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            낮음 (1~2)
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.stress.low.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.stress.low.avg_sys)} /{' '}
                                            {fmt(stats.stress.low.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            중간 (3)
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.stress.mid.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.stress.mid.avg_sys)} /{' '}
                                            {fmt(stats.stress.mid.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-800 px-2 py-1">
                                            높음 (4~5)
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {stats.stress.high.count}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                            {fmt(stats.stress.high.avg_sys)} /{' '}
                                            {fmt(stats.stress.high.avg_dia)} mmHg
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-[11px] text-slate-500">
                                ※ 통계는 기록된 데이터만 기준으로 계산되며, 표본 수가 적으면
                                실제 경향과 다를 수 있어요.
                            </p>
                        </div>
                    )}
                </section>

                {/* AI 인사이트 카드 */}
                {aiError && (
                    <p className="text-sm text-red-400">에러: {aiError}</p>
                )}
                {aiMessage && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <h2 className="font-semibold text-sm text-slate-100">
                            🧠 AI 라이프스타일 인사이트
                        </h2>
                        <p className="text-sm whitespace-pre-line text-slate-200">
                            {aiMessage}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            ※ 이 인사이트는 데이터 기반 참고용 조언이며, 의료적 진단이나 치료
                            지시가 아닙니다. 걱정되는 수치나 증상이 지속된다면 반드시 의료 전문가와 상담하세요.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
