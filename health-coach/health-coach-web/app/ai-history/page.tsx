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
    type: string; // "coach" | "lifestyle" | ...
    rangeDays: number;
    userNote?: string | null;
    source?: string | null;
    aiMessage: string;
};

export default function AiHistoryPage() {
    const [needLogin, setNeedLogin] = useState(false);
    const [logs, setLogs] = useState<AiCoachLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async (token: string) => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_BASE}/api/ai/history?limit=50`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`AI history API error: ${res.status}`);
            }

            const json = await res.json() as AiCoachLog[];
            // 최신순으로 정렬 (백엔드가 이미 정렬해줄 수도 있지만 안전하게 한 번 더)
            const sorted = [...json].sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            setLogs(sorted);
        } catch (err: any) {
            setError(
                err.message ?? 'AI 코칭 히스토리를 불러오는 중 오류가 발생했습니다.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setLoading(false);
            return;
        }

        fetchHistory(token);
    }, []);

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            '0',
        )}-${String(d.getDate()).padStart(2, '0')} ${String(
            d.getHours(),
        ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const typeLabel = (type: string) => {
        if (type === 'coach') return '혈압 코치';
        if (type === 'lifestyle') return '라이프스타일 인사이트';
        return type;
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-4xl p-6 space-y-6">
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">🕒 AI 코칭 히스토리</h1>
                        <p className="text-sm text-slate-300">
                            지금까지 받았던 AI 혈압 코치·라이프스타일 코멘트를 타임라인으로 확인해요.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/ai-coach"
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                        >
                            🤖 AI 코치로
                        </Link>
                        <Link
                            href="/"
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                        >
                            ⬅ 대시보드로
                        </Link>
                    </div>
                </header>

                {needLogin ? (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-sm text-slate-300">
                            코칭 히스토리는 로그인 후에 볼 수 있어요.
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
                    </section>
                ) : (
                    <section className="space-y-4">
                        {loading && <p className="text-sm text-slate-300">불러오는 중...</p>}
                        {error && (
                            <p className="text-sm text-red-400 whitespace-pre-line">
                                에러: {error}
                            </p>
                        )}

                        {!loading && !error && (
                            <>
                                {logs.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                        <p className="text-sm text-slate-300">
                                            아직 저장된 AI 코칭 기록이 없습니다.
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            AI 혈압 코치 또는 라이프스타일 인사이트 기능을 사용하면 여기에 기록이 쌓여요.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {logs.map(log => (
                                            <article
                                                key={log.id}
                                                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                                            >
                                                <div className="flex items-center justify-between text-xs text-slate-300">
                                                    <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold">
                              {typeLabel(log.type)}
                            </span>
                                                        <span className="text-slate-400">
                              분석 기간: 최근 {log.rangeDays}일
                            </span>
                                                    </div>
                                                    <span className="text-slate-500">
                            {formatDateTime(log.createdAt)}
                          </span>
                                                </div>

                                                {log.userNote && (
                                                    <div className="mt-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                            <span className="font-semibold text-slate-200">
                              내 메모:&nbsp;
                            </span>
                                                        {log.userNote}
                                                    </div>
                                                )}

                                                <div className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs whitespace-pre-line">
                                                    {log.aiMessage}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
