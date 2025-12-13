// app/ai-coach/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/authStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

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

export default function AiCoachPage() {
    // 📊 요약 데이터
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // 🤖 AI 코치
    const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
    const [userNote, setUserNote] = useState('');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // 🔐 로그인 필요 여부
    const [needLogin, setNeedLogin] = useState(false);

    // ─────────────────────────────────────
    // 1) 요약 데이터 불러오기 (토큰 필요)
    // ─────────────────────────────────────
    const fetchSummary = async (days: number, token: string) => {
        try {
            setLoadingSummary(true);
            setSummaryError(null);

            const res = await fetch(
                `${API_BASE}/api/records/stats/summary?rangeDays=${days}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `summary API error: ${res.status}`);
            }

            const json = (await res.json()) as SummaryResponse;
            setSummary(json);
        } catch (err: any) {
            setSummaryError(
                err.message ?? '요약 데이터를 불러오는 중 오류가 발생했습니다.',
            );
        } finally {
            setLoadingSummary(false);
        }
    };

    // 마운트 & rangeDays 변경 시 요약 호출
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setLoadingSummary(false);
            return;
        }
        fetchSummary(rangeDays, token);
    }, [rangeDays]);

    // ─────────────────────────────────────
    // 2) AI 코치 호출
    // ─────────────────────────────────────
    const handleAskCoach = async () => {
        setAiError(null);

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setAiError('AI 코치를 사용하려면 로그인해야 합니다.');
            return;
        }

        try {
            setAiLoading(true);

            const res = await fetch(`${API_BASE}/api/ai/coach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, // 🔹 토큰 헤더
                },
                body: JSON.stringify({
                    rangeDays,
                    userNote: userNote || null,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `AI 코치 호출 실패: ${res.status}`);
            }

            const json = (await res.json()) as {
                aiMessage?: string;
                message?: string;
            };

            setAiMessage(json.aiMessage ?? json.message ?? '(응답 본문 없음)');
        } catch (err: any) {
            setAiError(err.message ?? 'AI 코치 호출 중 오류가 발생했습니다.');
        } finally {
            setAiLoading(false);
        }
    };

    // ─────────────────────────────────────
    // 3) JSX
    // ─────────────────────────────────────
    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-3xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">🤖 AI 혈압 코치</h1>
                        <p className="text-sm text-slate-300">
                            최근 혈압 추이를 바탕으로 생활 습관 코멘트를 받아볼 수 있어요.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                    >
                        ⬅ 대시보드로
                    </Link><header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">🤖 AI 혈압 코치</h1>
                        <p className="text-sm text-slate-300">
                            최근 혈압 추이를 바탕으로 생활 습관 코멘트를 받아볼 수 있어요.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/"
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                        >
                            ⬅ 대시보드로
                        </Link>
                        <Link
                            href="/ai-history"
                            className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-xs font-semibold"
                        >
                            📜 코칭 히스토리 보기
                        </Link>
                    </div>
                </header>

                </header>

                {needLogin ? (
                    // 🔐 로그인 안 된 상태
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-sm text-slate-300">
                            AI 코치를 사용하려면 로그인이 필요합니다.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <Link
                                href="/auth/login"
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold"
                            >
                                로그인 하기
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
                            >
                                회원가입
                            </Link>
                        </div>
                        {(aiError || summaryError) && (
                            <p className="mt-3 text-xs text-red-400 whitespace-pre-line">
                                {aiError ?? summaryError}
                            </p>
                        )}
                    </section>
                ) : (
                    <>
                        {/* 📊 최근 N일 요약 카드 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">
                                    최근 {rangeDays}일 혈압·혈당 요약
                                </h2>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-400">분석 기간:</span>
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

                            {loadingSummary && (
                                <p className="text-sm text-slate-400">요약 데이터를 불러오는 중...</p>
                            )}

                            {summaryError && !loadingSummary && (
                                <p className="text-sm text-red-400 whitespace-pre-line">
                                    {summaryError}
                                </p>
                            )}

                            {!loadingSummary && !summaryError && summary && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                                        <div className="text-xs text-slate-400">
                                            평균 혈압 (최근 {summary.rangeDays}일)
                                        </div>
                                        <div className="text-lg font-bold">
                                            {summary.blood_pressure.avg_sys !== null &&
                                            summary.blood_pressure.avg_dia !== null
                                                ? `${Math.round(
                                                    summary.blood_pressure.avg_sys,
                                                )} / ${Math.round(
                                                    summary.blood_pressure.avg_dia,
                                                )} mmHg`
                                                : '데이터 없음'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            측정 횟수: {summary.blood_pressure.count}회
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                                        <div className="text-xs text-slate-400">
                                            평균 혈당 (최근 {summary.rangeDays}일)
                                        </div>
                                        <div className="text-lg font-bold">
                                            {summary.blood_sugar.avg !== null
                                                ? `${Math.round(summary.blood_sugar.avg)} mg/dL`
                                                : '데이터 없음'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            측정 횟수: {summary.blood_sugar.count}회
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!loadingSummary && !summaryError && !summary && (
                                <p className="text-sm text-slate-400">
                                    아직 요약에 사용할 데이터가 부족합니다. 대시보드에서 혈압 기록을
                                    조금 더 채워보세요.
                                </p>
                            )}
                        </section>

                        {/* 🤖 AI 코치 섹션 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-300">
                                    AI 코치에게 전하고 싶은 말 (선택)
                                </label>
                                <textarea
                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm min-h-[80px]"
                                    placeholder="요즘 잠이 부족해요, 커피도 많이 마셔요 같은 느낌으로 적어보세요."
                                    value={userNote}
                                    onChange={(e) => setUserNote(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-500">
                                    이 메모 내용과 최근 {rangeDays}일의 평균 혈압/혈당, 최근 측정 기록,
                                    목표 혈압 등을 함께 고려해서 코멘트를 생성합니다.
                                </p>
                            </div>

                            {aiError && (
                                <p className="text-sm text-red-400 whitespace-pre-line">
                                    {aiError}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleAskCoach}
                                disabled={aiLoading}
                                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold disabled:opacity-60"
                            >
                                {aiLoading
                                    ? 'AI 코치에게 물어보는 중...'
                                    : 'AI 코치에게 분석 요청하기'}
                            </button>

                            {aiMessage && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm whitespace-pre-line">
                                    {aiMessage}
                                </div>
                            )}

                            <p className="mt-2 text-[11px] text-slate-500">
                                ※ 이 코멘트는 생활 습관 참고용으로 제공되며, 의료적 진단이나 치료
                                지시가 아닙니다. 걱정되는 수치가 계속된다면 반드시 의료 전문가와
                                상담하세요.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
