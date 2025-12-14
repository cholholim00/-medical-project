// app/ai-history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/authStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

type AiCoachLog = {
    id: number;
    userId: number;
    createdAt: string;
    type: string;
    rangeDays: number;
    userNote?: string | null;
    source?: string | null;
    aiMessage: string;
};

export default function AiHistoryPage() {
    const [logs, setLogs] = useState<AiCoachLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needLogin, setNeedLogin] = useState(false);


    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_BASE}/api/ai/history?limit=50`);
            if (!res.ok) {
                throw new Error(`history API error: ${res.status}`);
            }

            const json = (await res.json()) as AiCoachLog[];
            setLogs(json);
        } catch (err: any) {
            setError(err.message ?? 'AI 코치 히스토리를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };

    const typeLabel = (type: string) => {
        if (type === 'coach') return '개인 코치';
        if (type === 'lifestyle') return '라이프스타일 인사이트';
        return type;
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📜 AI 코치 히스토리</h1>
                        <p className="text-sm text-slate-300">
                            그동안 AI 코치에게 받았던 조언들을 한 곳에 모아서 볼 수 있어요.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
                        >
                            🏠 대시보드
                        </Link>
                        <Link
                            href="/ai-coach"
                            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
                        >
                            🤖 AI 코치
                        </Link>
                        <Link
                            href="/insights"
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold"
                        >
                            📊 인사이트
                        </Link>
                    </div>
                </header>

                {/* 내용 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    {loading && <p className="text-sm text-slate-400">불러오는 중...</p>}
                    {error && <p className="text-sm text-red-400">에러: {error}</p>}

                    {!loading && !error && logs.length === 0 && (
                        <p className="text-sm text-slate-400">
                            아직 저장된 AI 코치 히스토리가 없어요. 먼저 AI 코치 페이지에서 질문을 해보세요.
                        </p>
                    )}

                    {!loading && !error && logs.length > 0 && (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <article
                                    key={log.id}
                                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-700 text-[11px] text-slate-200">
                        {typeLabel(log.type)}
                      </span>
                                            <span className="text-[11px] text-slate-400">
                        {formatDate(log.createdAt)} · 최근 {log.rangeDays}일 기준
                      </span>
                                        </div>
                                        {log.source && (
                                            <span className="text-[10px] text-slate-500">
                        source: {log.source}
                      </span>
                                        )}
                                    </div>

                                    {log.userNote && (
                                        <div className="text-xs text-slate-300 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2">
                      <span className="font-semibold text-slate-200">
                        사용자가 남긴 메모:
                      </span>{' '}
                                            {log.userNote}
                                        </div>
                                    )}

                                    <div className="text-sm text-slate-200 whitespace-pre-line">
                                        {log.aiMessage}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
