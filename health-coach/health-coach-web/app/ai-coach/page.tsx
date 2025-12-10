// app/ai-coach/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:5001'; // 👉 네가 실제로 쓰는 포트/주소로 맞춰줘!

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
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);
    const [userNote, setUserNote] = useState('');
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // 최근 N일 요약 가져오기
    const fetchSummary = async (days: number) => {
        try {
            setLoadingSummary(true);
            setSummaryError(null);

            const res = await fetch(
                `${API_BASE}/api/records/stats/summary?rangeDays=${days}`,
            );

            if (!res.ok) {
                throw new Error(`summary API error: ${res.status}`);
            }

            const json = (await res.json()) as SummaryResponse;
            setSummary(json);
        } catch (err: any) {
            setSummaryError(err.message ?? '요약 데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchSummary(rangeDays);
    }, [rangeDays]);

    // AI 코치 호출
    const handleAskCoach = async () => {
        try {
            setAiLoading(true);
            setAiError(null);
            setAiMessage(null);

            const res = await fetch(`${API_BASE}/api/ai/coach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rangeDays,
                    userNote: userNote.trim(),
                }),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `AI API error: ${res.status}`);
            }

            const json = await res.json();
            setAiMessage(json.message ?? '');
        } catch (err: any) {
            setAiError(
                err.message ?? 'AI 코치 메시지를 가져오는 중 오류가 발생했습니다.',
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
                        <h1 className="text-2xl font-bold">🤖 AI 혈압 코치</h1>
                        <p className="text-sm text-slate-300">
                            최근 혈압 기록과 함께, 지금 느끼는 상태를 적어 보내면
                            AI가 부드럽게 생활 습관 코멘트를 해줄 거야.
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
                            href="/insights"
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold"
                        >
                            📊 라이프스타일 인사이트
                        </Link>
                        <Link
                            href="/ai-history"
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
                        >
                            📜 히스토리
                        </Link>

                    </div>
                </header>

                {/* 기간 선택 + 요약 카드 */}
                <section className="grid md:grid-cols-3 gap-4">
                    {/* 왼쪽: 기간 선택 + 숫자 요약 */}
                    <div className="md:col-span-1 space-y-3">
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-200 font-semibold">
                  분석 기간
                </span>
                                <select
                                    value={rangeDays}
                                    onChange={(e) =>
                                        setRangeDays(Number(e.target.value) as 7 | 14 | 30)
                                    }
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                                >
                                    <option value={7}>최근 7일</option>
                                    <option value={14}>최근 14일</option>
                                    <option value={30}>최근 30일</option>
                                </select>
                            </div>

                            {loadingSummary && (
                                <p className="text-xs text-slate-400">요약 데이터를 불러오는 중...</p>
                            )}
                            {summaryError && (
                                <p className="text-xs text-red-400">
                                    에러: {summaryError}
                                </p>
                            )}

                            {!loadingSummary && !summaryError && summary && (
                                <div className="space-y-3 text-sm text-slate-300">
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">
                                            평균 혈압
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
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">
                                            평균 혈당
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
                                    <p className="text-[11px] text-slate-500">
                                        ※ 이 수치는 참고용 통계이며, 의료적 진단이 아닙니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽: 메모 입력 + 버튼 */}
                    <div className="md:col-span-2 space-y-3">
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                            <h2 className="font-semibold text-slate-100 text-sm">
                                요즘 내 상태 / 고민 적어보기
                            </h2>
                            <p className="text-xs text-slate-400">
                                예시: &quot;요즘 잠을 5시간밖에 못 자고, 커피를 하루에 3잔 이상 마셔요.
                                운동은 거의 못했고, 스트레스도 많은 편이에요.&quot;
                            </p>
                            <textarea
                                value={userNote}
                                onChange={(e) => setUserNote(e.target.value)}
                                rows={5}
                                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                placeholder="요즘 컨디션, 생활 패턴, 걱정되는 점 등을 자유롭게 적어주세요. (선택)"
                            />
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-slate-500">
                                    ※ 입력 내용은 AI 코치 답변 생성에만 사용되며, 실제 서버 DB에는 따로 저장하지 않아도 돼요(저장하고 싶으면 나중에 기능 추가).
                                </p>
                                <button
                                    onClick={handleAskCoach}
                                    disabled={aiLoading}
                                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold disabled:opacity-60"
                                >
                                    {aiLoading ? '분석 중...' : '🤖 AI 코치에게 분석 요청'}
                                </button>
                            </div>
                            {aiError && (
                                <p className="text-xs text-red-400 mt-1">
                                    에러: {aiError}
                                </p>
                            )}
                        </div>

                        {aiMessage && (
                            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                <h2 className="font-semibold text-slate-100 text-sm">
                                    AI 코치의 코멘트
                                </h2>
                                <p className="text-sm whitespace-pre-line text-slate-200">
                                    {aiMessage}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    ※ 이 코멘트는 생활 습관을 돌아보는 참고용 조언입니다.
                                    걱정되는 수치나 증상이 계속된다면 꼭 의료 전문가와 상담하세요.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
