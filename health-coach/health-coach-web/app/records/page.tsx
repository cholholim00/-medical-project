// app/records/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/authStorage';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

type RecordType = 'blood_pressure' | 'blood_sugar';

type HealthRecord = {
    id: number;
    datetime: string;
    type: RecordType;
    value1: number;
    value2?: number | null;
    pulse?: number | null;
    state?: string | null;
    memo?: string | null;
    sleepHours?: number | null;
    exercise?: boolean | null;
    stressLevel?: number | null;
};

type FilterType = 'all' | RecordType;

export default function RecordsPage() {
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needLogin, setNeedLogin] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [deletingId, setDeletingId] = useState<number | null>(null);


    // ---- 기록 목록 불러오기 (로그인 필요) ----
    const fetchRecords = async (token: string, filter: FilterType) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set('limit', '200');
            if (filter !== 'all') {
                params.set('type', filter);
            }

            const res = await fetch(
                `${API_BASE}/api/records?${params.toString()}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`, // 🔹 토큰 붙이기
                    },
                },
            );

            if (!res.ok) {
                throw new Error(`records API error: ${res.status}`);
            }

            const json = (await res.json()) as HealthRecord[];
            setRecords(json);
        } catch (err: any) {
            setError(err.message ?? '기록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 첫 진입 + 필터 변경 시, 토큰 확인 후 기록 불러오기
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setLoading(false);
            return;
        }

        fetchRecords(token, filterType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType]);

    // ---- 기록 삭제 ----
    const handleDelete = async (id: number) => {
        const ok = window.confirm('이 기록을 정말 삭제할까요?');
        if (!ok) return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setError('기록을 삭제하려면 로그인해야 합니다.');
            return;
        }

        try {
            setDeletingId(id);
            setError(null);

            const res = await fetch(`${API_BASE}/api/records/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, // 🔹 토큰 붙이기
                },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `삭제 실패: ${res.status}`);
            }

            // 삭제 성공 후 목록에서 제거
            setRecords((prev) => prev.filter((r) => r.id !== id));
        } catch (err: any) {
            setError(err.message ?? '기록 삭제 중 오류가 발생했습니다.');
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
                        <h1 className="text-2xl font-bold">📋 전체 건강 기록 관리</h1>
                        <p className="text-sm text-slate-300">
                            저장된 혈압/혈당 기록을 한눈에 보고, 필요하면 삭제할 수 있어요.
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
                            href="/records/new"
                            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold"
                        >
                            ➕ 새 기록 추가
                        </Link>
                    </div>
                </header>

                {/* 로그인 필요 안내 */}
                {needLogin ? (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-sm text-slate-300">
                            전체 기록을 보려면 먼저 로그인해야 합니다.
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
                    <>
                        {/* 필터 섹션 */}
                        <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-sm text-slate-300">
                                원하는 기록 종류만 골라서 볼 수 있어요.
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-300">종류:</span>
                                <select
                                    value={filterType}
                                    onChange={(e) =>
                                        setFilterType(e.target.value as FilterType)
                                    }
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                                >
                                    <option value="all">전체</option>
                                    <option value="blood_pressure">혈압만</option>
                                    <option value="blood_sugar">혈당만</option>
                                </select>
                            </div>
                        </section>

                        {loading && <p>불러오는 중...</p>}
                        {error && (
                            <p className="text-sm text-red-400 whitespace-pre-line">
                                에러: {error}
                            </p>
                        )}

                        {!loading && !error && (
                            <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                {records.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        선택한 조건에 맞는 기록이 없습니다.
                                        <br />
                                        상단의 &quot;새 기록 추가&quot; 버튼으로 건강 데이터를
                                        추가해보세요.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                            <tr className="bg-slate-800">
                                                <th className="border border-slate-700 px-2 py-1 text-left whitespace-nowrap">
                                                    날짜/시간
                                                </th>
                                                <th className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                                    종류
                                                </th>
                                                <th className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                                    값
                                                </th>
                                                <th className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                                    상태
                                                </th>
                                                <th className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                                    메모
                                                </th>
                                                <th className="border border-slate-700 px-2 py-1 whitespace-nowrap">
                                                    행동
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {records.map((r) => {
                                                const d = new Date(r.datetime);
                                                const dateStr = `${d.getFullYear()}-${String(
                                                    d.getMonth() + 1,
                                                ).padStart(2, '0')}-${String(d.getDate()).padStart(
                                                    2,
                                                    '0',
                                                )} ${String(d.getHours()).padStart(
                                                    2,
                                                    '0',
                                                )}:${String(d.getMinutes()).padStart(2, '0')}`;

                                                const typeLabel =
                                                    r.type === 'blood_pressure' ? '혈압' : '혈당';

                                                const valueLabel =
                                                    r.type === 'blood_pressure'
                                                        ? `${r.value1}${
                                                            r.value2 != null ? ` / ${r.value2}` : ''
                                                        } mmHg`
                                                        : `${r.value1} mg/dL`;

                                                return (
                                                    <tr key={r.id}>
                                                        <td className="border border-slate-800 px-2 py-1 whitespace-nowrap">
                                                            {dateStr}
                                                        </td>
                                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                                            {typeLabel}
                                                        </td>
                                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                                            {valueLabel}
                                                        </td>
                                                        <td className="border border-slate-800 px-2 py-1 text-center">
                                                            {r.state ?? '-'}
                                                        </td>
                                                        <td className="border border-slate-800 px-2 py-1 max-w-[260px]">
                                                            {r.memo ?? ''}
                                                        </td>
                                                        <td className="border border-slate-800 px-2 py-1 text-center whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleDelete(r.id)}
                                                                disabled={deletingId === r.id}
                                                                className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-xs font-semibold disabled:opacity-60"
                                                            >
                                                                {deletingId === r.id ? '삭제 중...' : '삭제'}
                                                            </button>
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
                    </>
                )}
            </div>
        </main>
    );
}
