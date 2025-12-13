// app/insights/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/authStorage';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

type LifestyleGroup = {
    label: string;
    count: number;
    avg_sys: number | null;
    avg_dia: number | null;
};

type LifestyleStatsResponse = {
    rangeDays: number;
    sleepGroups: LifestyleGroup[];
    exerciseGroups: LifestyleGroup[];
    stressGroups: LifestyleGroup[];
};

export default function InsightsPage() {
    const [rangeDays, setRangeDays] = useState<30 | 60>(30);

    const [stats, setStats] = useState<LifestyleStatsResponse | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const [needLogin, setNeedLogin] = useState(false);

    // 🔹 라이프스타일 통계 불러오기 (토큰 필요)
    const fetchStats = async (token: string, days: number) => {
        try {
            setLoadingStats(true);
            setStatsError(null);

            const res = await fetch(
                `${API_BASE}/api/records/stats/lifestyle?rangeDays=${days}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    err.error || `lifestyle stats API error: ${res.status}`,
                );
            }

            const json = (await res.json()) as LifestyleStatsResponse;
            setStats(json);
        } catch (err: any) {
            setStatsError(
                err.message ?? '라이프스타일 인사이트 데이터를 불러오는 중 오류가 발생했습니다.',
            );
        } finally {
            setLoadingStats(false);
        }
    };

    // 🔹 첫 진입 / 기간 변경 시 토큰 확인 + 데이터 호출
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setLoadingStats(false);
            return;
        }

        fetchStats(token, rangeDays);
    }, [rangeDays]);

    // 🔹 AI 인사이트 요청
    const handleAskInsight = async () => {
        setAiError(null);
        setAiMessage(null);

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setAiError('AI 인사이트를 사용하려면 로그인이 필요합니다.');
            return;
        }

        try {
            setAiLoading(true);

            const res = await fetch(`${API_BASE}/api/ai/lifestyle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rangeDays }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    err.error || `AI lifestyle API error: ${res.status}`,
                );
            }

            const json = (await res.json()) as {
                aiMessage?: string;
                message?: string;
            };

            setAiMessage(json.aiMessage ?? json.message ?? '(응답 본문 없음)');
        } catch (err: any) {
            setAiError(
                err.message ?? 'AI 인사이트 요청 중 오류가 발생했습니다.',
            );
        } finally {
            setAiLoading(false);
        }
    };

    // 공통 테이블 렌더링 컴포넌트
    const renderGroupTable = (title: string, groups: LifestyleGroup[]) => {
        if (!groups || groups.length === 0) {
            return (
                <p className="text-sm text-slate-400">
                    해당 항목에 대한 데이터가 아직 없습니다.
                </p>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                    <tr className="bg-slate-800">
                        <th className="border border-slate-700 px-2 py-1 text-left">
                            {title}
                        </th>
                        <th className="border border-slate-700 px-2 py-1">측정 횟수</th>
                        <th className="border border-slate-700 px-2 py-1">
                            평균 혈압 (수축기 / 이완기)
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {groups.map((g) => (
                        <tr key={g.label}>
                            <td className="border border-slate-800 px-2 py-1 whitespace-nowrap">
                                {g.label}
                            </td>
                            <td className="border border-slate-800 px-2 py-1 text-center">
                                {g.count}회
                            </td>
                            <td className="border border-slate-800 px-2 py-1 text-center">
                                {g.avg_sys !== null && g.avg_dia !== null
                                    ? `${Math.round(g.avg_sys)} / ${Math.round(g.avg_dia)} mmHg`
                                    : '데이터 없음'}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-4xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📊 라이프스타일 인사이트</h1>
                        <p className="text-sm text-slate-300">
                            수면, 운동, 스트레스 패턴에 따라 혈압이 어떻게 달라지는지 확인할 수 있어요.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/"
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                        >
                            ⬅ 대시보드로
                        </Link>
                    </div>
                </header>

                {/* 로그인 필요 안내 */}
                {needLogin && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <p className="text-sm text-slate-300">
                            이 페이지는 내 기록을 기반으로 인사이트를 보여주기 때문에 로그인이 필요해요.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/auth/login"
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold"
                            >
                                로그인 하러 가기
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
                            >
                                회원가입
                            </Link>
                        </div>
                        {statsError && (
                            <p className="text-xs text-red-400 whitespace-pre-line">
                                {statsError}
                            </p>
                        )}
                    </section>
                )}

                {/* 로그인 되어 있을 때만 본문 표시 */}
                {!needLogin && (
                    <>
                        {/* 기간 선택 + 요약 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="text-sm text-slate-300">
                                    최근 일정 기간 동안의 수면/운동/스트레스 패턴과 혈압 관계를 분석해요.
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-300">분석 기간:</span>
                                    <select
                                        value={rangeDays}
                                        onChange={(e) =>
                                            setRangeDays(Number(e.target.value) as 30 | 60)
                                        }
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                                    >
                                        <option value={30}>최근 30일</option>
                                        <option value={60}>최근 60일</option>
                                    </select>
                                </div>
                            </div>

                            {loadingStats && (
                                <p className="text-sm text-slate-400">통계를 불러오는 중...</p>
                            )}
                            {statsError && (
                                <p className="text-sm text-red-400 whitespace-pre-line">
                                    {statsError}
                                </p>
                            )}
                            {!loadingStats && !statsError && !stats && (
                                <p className="text-sm text-slate-400">
                                    아직 라이프스타일 데이터가 없습니다. 기록 추가 후 다시 확인해 주세요.
                                </p>
                            )}
                        </section>

                        {/* 통계 테이블들 */}
                        {stats && (
                            <section className="space-y-4">
                                {/* 수면 */}
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                    <h2 className="font-semibold">😴 수면 시간 vs 혈압</h2>
                                    <p className="text-xs text-slate-400">
                                        예: 6시간 미만 / 6시간 이상 그룹으로 나눠서 혈압 차이를 봅니다.
                                    </p>
                                    {renderGroupTable('수면 그룹', stats.sleepGroups)}
                                </div>

                                {/* 운동 */}
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                    <h2 className="font-semibold">🏃 운동 여부 vs 혈압</h2>
                                    <p className="text-xs text-slate-400">
                                        운동한 날과 운동하지 않은 날의 평균 혈압 차이를 비교합니다.
                                    </p>
                                    {renderGroupTable('운동 여부', stats.exerciseGroups)}
                                </div>

                                {/* 스트레스 */}
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                    <h2 className="font-semibold">🧠 스트레스 수준 vs 혈압</h2>
                                    <p className="text-xs text-slate-400">
                                        스트레스 지수(1~5)를 낮음/중간/높음으로 나누어 혈압 경향을 봅니다.
                                    </p>
                                    {renderGroupTable('스트레스 수준', stats.stressGroups)}
                                </div>
                            </section>
                        )}

                        {/* AI 인사이트 섹션 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="font-semibold">🧠 AI 라이프스타일 인사이트</h2>
                                <button
                                    type="button"
                                    onClick={handleAskInsight}
                                    disabled={aiLoading || loadingStats || !!statsError}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold disabled:opacity-60"
                                >
                                    {aiLoading
                                        ? 'AI가 분석 중...'
                                        : 'AI에게 패턴 분석 요청하기'}
                                </button>
                            </div>

                            {aiError && (
                                <p className="text-sm text-red-400 whitespace-pre-line">
                                    {aiError}
                                </p>
                            )}

                            {aiMessage && (
                                <div className="mt-2 p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm whitespace-pre-line">
                                    {aiMessage}
                                </div>
                            )}

                            <p className="mt-2 text-[11px] text-slate-500">
                                ※ 이 코멘트는 생활 습관 참고용으로 제공되며, 의료적 진단이나 치료 지시가
                                아닙니다. 걱정되는 수치가 계속된다면 반드시 의료 전문가와 상담하세요.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
