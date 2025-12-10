// app/records/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:4000';

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

export default function RecordsPage() {
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 날짜 필터 (선택)
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE}/api/records?type=blood_pressure`,
            );
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const json = (await res.json()) as HealthRecord[];

            const sorted = [...json].sort(
                (a, b) =>
                    new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
            );
            setRecords(sorted);
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const filteredRecords = useMemo(() => {
        if (!from && !to) return records;

        return records.filter((r) => {
            const time = new Date(r.datetime).getTime();
            if (from) {
                const fromTime = new Date(from + 'T00:00').getTime();
                if (time < fromTime) return false;
            }
            if (to) {
                const toTime = new Date(to + 'T23:59').getTime();
                if (time > toTime) return false;
            }
            return true;
        });
    }, [records, from, to]);

    const handleDelete = async (id: number) => {
        const ok = window.confirm('정말 이 기록을 삭제할까요?');
        if (!ok) return;

        try {
            setDeletingId(id);
            setError(null);

            const res = await fetch(`${API_BASE}/api/records/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `delete API error: ${res.status}`);
            }

            setRecords((prev) => prev.filter((r) => r.id !== id));
        } catch (err: any) {
            setError(err.message ?? '삭제 중 오류가 발생했어요.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📋 혈압 기록 관리</h1>
                        <p className="text-sm text-slate-300">
                            그동안 저장한 혈압 기록을 한 번에 보고, 필요하면 삭제할 수 있어.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/" className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold">← 대시보드로</Link>
                        <Link href="/records/new" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold">➕ 새 기록 추가</Link>
                    </div>
                </header>

                {/* 필터 영역 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-200">
                        날짜 범위 필터 (선택)
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-300">From</span>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-300">To</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setFrom('');
                                setTo('');
                            }}
                            className="text-xs px-3 py-1 rounded-lg border border-slate-600 bg-slate-950 hover:bg-slate-800"
                        >
                            필터 초기화
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                        날짜 범위를 지정하지 않으면 모든 기록이 표시돼요.
                    </p>
                </section>

                {loading && <p>불러오는 중...</p>}
                {error && <p className="text-sm text-red-400">에러: {error}</p>}

                {/* 테이블 */}
                {!loading && !error && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <h2 className="font-semibold mb-2 text-sm">전체 혈압 기록</h2>
                        {filteredRecords.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                조건에 맞는 기록이 없어요. 날짜 범위를 바꾸거나, 새 기록을 추가해보세요.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                    <tr className="bg-slate-800">
                                        <th className="border border-slate-700 px-2 py-1 text-left">
                                            날짜/시간
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            혈압
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            수면
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            운동
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            스트레스
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            상태/메모
                                        </th>
                                        <th className="border border-slate-700 px-2 py-1">
                                            관리
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredRecords.map((r) => {
                                        const date = new Date(r.datetime);
                                        const dateStr = `${date.getFullYear()}-${String(
                                            date.getMonth() + 1,
                                        ).padStart(2, '0')}-${String(
                                            date.getDate(),
                                        ).padStart(2, '0')} ${String(
                                            date.getHours(),
                                        ).padStart(2, '0')}:${String(
                                            date.getMinutes(),
                                        ).padStart(2, '0')}`;

                                        return (
                                            <tr key={r.id}>
                                                <td className="border border-slate-800 px-2 py-1 whitespace-nowrap">
                                                    {dateStr}
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap">
                                                    {r.value1}
                                                    {r.value2 != null ? ` / ${r.value2}` : ''}
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap">
                                                    {r.sleepHours != null ? `${r.sleepHours}h` : '-'}
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap">
                                                    {r.exercise == null
                                                        ? '-'
                                                        : r.exercise
                                                            ? 'O'
                                                            : 'X'}
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap">
                                                    {r.stressLevel != null ? `${r.stressLevel}/5` : '-'}
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1">
                                                    <div className="text-xs text-slate-200">
                                                        {r.state && (
                                                            <span className="font-semibold">
                                  [{r.state}]{' '}
                                </span>
                                                        )}
                                                        <span className="text-slate-300">
                                {r.memo ?? ''}
                              </span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-800 px-2 py-1 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link
                                                            href={`/records/${r.id}/edit`}
                                                            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
                                                        >
                                                            수정
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(r.id)}
                                                            disabled={deletingId === r.id}
                                                            className="px-3 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-xs font-semibold disabled:opacity-60"
                                                        >
                                                            {deletingId === r.id ? '삭제 중...' : '삭제'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
