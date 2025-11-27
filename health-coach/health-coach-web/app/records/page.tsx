// app/records/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from 'recharts';

const API_BASE = 'https://medical-project-xuji.onrender.com';

type HealthRecord = {
    id: number;
    datetime: string;
    type: 'blood_sugar' | 'blood_pressure';
    value1: number;  // 수축기
    value2?: number; // 이완기
    state?: string;
    memo?: string;
};

export default function RecordsPage() {
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 데이터 불러오기
    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/records?type=blood_pressure`
            );
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const json = (await res.json()) as HealthRecord[];
            setRecords(json);
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // 날짜 순으로 정렬 + 그래프용 데이터
    const sortedRecords = useMemo(() => {
        return [...records].sort(
            (a, b) =>
                new Date(a.datetime).getTime() -
                new Date(b.datetime).getTime()
        );
    }, [records]);

    const chartData = useMemo(
        () =>
            sortedRecords.map((r) => ({
                // 레이블용: 날짜 + 시간 간단하게
                label: new Date(r.datetime).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                sys: r.value1,
                dia: r.value2 ?? null,
            })),
        [sortedRecords]
    );

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 상단 헤더 */}
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">📊 혈압 기록 히스토리</h1>
                        <p className="text-sm text-slate-300">
                            최근에 저장한 혈압 기록을 시간 순으로 보고,
                            추세를 그래프로 살펴볼 수 있어.
                        </p>
                    </div>
                    <Link
                        href="/records/new"
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold"
                    >
                        ➕ 새 기록 추가
                    </Link>
                </header>

                {/* 상태 표시 */}
                {loading && <p>불러오는 중...</p>}
                {error && (
                    <p className="text-red-400">에러: {error}</p>
                )}

                {!loading && !error && records.length === 0 && (
                    <p className="text-sm text-slate-300">
                        아직 기록이 없습니다. 상단의 &quot;새 기록 추가&quot; 버튼을 눌러
                        첫 번째 혈압 기록을 추가해 보세요.
                    </p>
                )}

                {/* 그래프 */}
                {!loading && !error && records.length > 0 && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <h2 className="font-semibold mb-2">혈압 추세 그래프</h2>
                        <p className="text-xs text-slate-400 mb-2">
                            X축은 측정 시간, Y축은 수축기/이완기 혈압(mmHg)입니다.
                        </p>
                        <div className="w-full h-72">
                            <ResponsiveContainer>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 10 }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10 }}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="sys"
                                        name="수축기"
                                        stroke="#60a5fa"
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="dia"
                                        name="이완기"
                                        stroke="#f97373"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* 테이블 */}
                {!loading && !error && records.length > 0 && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <h2 className="font-semibold mb-2">상세 기록 목록</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                <tr className="bg-slate-800">
                                    <th className="border border-slate-700 px-2 py-1">
                                        날짜/시간
                                    </th>
                                    <th className="border border-slate-700 px-2 py-1">
                                        수축기
                                    </th>
                                    <th className="border border-slate-700 px-2 py-1">
                                        이완기
                                    </th>
                                    <th className="border border-slate-700 px-2 py-1">
                                        상태
                                    </th>
                                    <th className="border border-slate-700 px-2 py-1">
                                        메모
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedRecords.map((r) => (
                                    <tr key={r.id}>
                                        <td className="border border-slate-800 px-2 py-1 whitespace-nowrap">
                                            {new Date(r.datetime).toLocaleString('ko-KR')}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-right">
                                            {r.value1}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 text-right">
                                            {r.value2 ?? '-'}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1">
                                            {r.state ?? '-'}
                                        </td>
                                        <td className="border border-slate-800 px-2 py-1 max-w-xs truncate">
                                            {r.memo ?? ''}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
