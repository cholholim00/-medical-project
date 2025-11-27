// app/ai-coach/page.tsx
'use client';

import { useEffect, useState } from 'react';

type StateStat = {
    state: string;
    count: number;
    avg_sys: number | null;
    avg_dia: number | null;
};

type CoachResponse = {
    rangeDays: number;
    from: string;
    to: string;
    summaryLines: string[];
    tips: string[];
    states: StateStat[];
};

const API_BASE = 'http://localhost:4000';

export default function AiCoachPage() {
    const [data, setData] = useState<CoachResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rangeDays, setRangeDays] = useState(14);

    const fetchCoach = async (days: number) => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/records/ai/coach?rangeDays=${days}`
            );
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const json = (await res.json()) as CoachResponse;
            setData(json);
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoach(rangeDays);
    }, [rangeDays]);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-3xl p-6">
                <h1 className="text-2xl font-bold mb-2">🤖 AI 혈압 코치</h1>
                <p className="text-sm text-slate-300 mb-4">
                    백엔드에서 계산한 통계를 바탕으로, 최근 기간 동안의 혈압 패턴을 요약해서
                    보여줘.
                </p>

                {/* 기간 선택 */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-slate-300">분석 기간:</span>
                    <select
                        value={rangeDays}
                        onChange={(e) => setRangeDays(parseInt(e.target.value, 10))}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                    >
                        <option value={7}>최근 7일</option>
                        <option value={14}>최근 14일</option>
                        <option value={30}>최근 30일</option>
                    </select>
                </div>

                {loading && <p>불러오는 중...</p>}
                {error && <p className="text-red-400">에러: {error}</p>}

                {!loading && !error && data && (
                    <div className="space-y-6">
                        {/* 요약 문장들 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <h2 className="font-semibold mb-2">요약</h2>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {data.summaryLines.map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                ))}
                            </ul>
                        </section>

                        {/* 코치 팁 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <h2 className="font-semibold mb-2">코치 메시지</h2>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {data.tips.map((tip, idx) => (
                                    <li key={idx}>{tip}</li>
                                ))}
                            </ul>
                        </section>

                        {/* 상태별 통계 표 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <h2 className="font-semibold mb-2">상태별 평균 혈압</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                    <tr className="bg-slate-800">
                                        <th className="border border-slate-700 px-2 py-1">
                                            상태
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            횟수
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            평균 수축기
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            평균 이완기
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {data.states.map((s) => (
                                        <tr key={s.state}>
                                            <td className="border border-slate-800 px-2 py-1">
                                                {s.state}
                                            </td>
                                            <td className="border border-slate-800 px-2 py-1 text-right">
                                                {s.count}
                                            </td>
                                            <td className="border border-slate-800 px-2 py-1 text-right">
                                                {s.avg_sys !== null
                                                    ? Math.round(s.avg_sys)
                                                    : '-'}
                                            </td>
                                            <td className="border border-slate-800 px-2 py-1 text-right">
                                                {s.avg_dia !== null
                                                    ? Math.round(s.avg_dia)
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
