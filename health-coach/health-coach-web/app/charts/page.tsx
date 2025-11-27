// app/charts/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

const API_BASE = 'https://medical-project-xuji.onrender.com';

type HealthRecord = {
    id: number;
    datetime: string;
    type: 'blood_pressure' | 'blood_sugar';
    value1: number; // 수축기
    value2?: number; // 이완기
    state?: string | null;
    memo?: string | null;
};

type RangeOption = 7 | 14 | 30;

type ChartPoint = {
    id: number;
    datetime: string;
    label: string; // 축에 찍힐 글자
    sys: number;
    dia: number | null;
    state?: string | null;
};

export default function ChartsPage() {
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rangeDays, setRangeDays] = useState<RangeOption>(14);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_BASE}/api/records?type=blood_pressure`);
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const json = (await res.json()) as HealthRecord[];

            const sorted = [...json].sort(
                (a, b) =>
                    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
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
        if (records.length === 0) return [];

        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - rangeDays);

        return records.filter(
            (r) => new Date(r.datetime).getTime() >= from.getTime()
        );
    }, [records, rangeDays]);

    const chartData: ChartPoint[] = useMemo(() => {
        return filteredRecords.map((r) => {
            const d = new Date(r.datetime);
            const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
                d.getDate()
            ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
                d.getMinutes()
            ).padStart(2, '0')}`;

            return {
                id: r.id,
                datetime: r.datetime,
                label,
                sys: r.value1,
                dia: typeof r.value2 === 'number' ? r.value2 : null,
                state: r.state,
            };
        });
    }, [filteredRecords]);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold">📈 혈압 추이 라인차트</h1>
                        <p className="text-sm text-slate-300">
                            백엔드의 /api/records?type=blood_pressure 데이터를 기반으로, 최근
                            기간 동안의 혈압 변화를 시각화한 페이지야.
                        </p>
                    </div>
                </header>

                {/* 기간 선택 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-slate-300">
                        분석하고 싶은 기간을 선택하면, 그 범위 안에 있는 혈압 기록만 차트로
                        보여줄게.
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-300">기간:</span>
                        <select
                            value={rangeDays}
                            onChange={(e) =>
                                setRangeDays(Number(e.target.value) as RangeOption)
                            }
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm"
                        >
                            <option value={7}>최근 7일</option>
                            <option value={14}>최근 14일</option>
                            <option value={30}>최근 30일</option>
                        </select>
                    </div>
                </section>

                {loading && <p>불러오는 중...</p>}
                {error && <p className="text-red-400 text-sm">에러: {error}</p>}

                {!loading && !error && (
                    <>
                        {chartData.length === 0 ? (
                            <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                <p className="text-sm text-slate-300">
                                    선택한 기간({rangeDays}일) 안에 혈압 기록이 없어요.
                                    <br />
                                    홈 대시보드에서 샘플 데이터를 생성하거나, 직접 기록을
                                    추가해보세요.
                                </p>
                            </section>
                        ) : (
                            <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                <h2 className="font-semibold mb-2">혈압 추이</h2>

                                <div className="w-full overflow-x-auto">
                                    {/* 고정 크기 차트 */}
                                    <div className="min-w-[720px]">
                                        <LineChart
                                            width={720}
                                            height={320}
                                            data={chartData}
                                            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 10, fill: '#cbd5f5' }}
                                                minTickGap={20}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 10, fill: '#cbd5f5' }}
                                                domain={['auto', 'auto']}
                                                label={{
                                                    value: 'mmHg',
                                                    angle: -90,
                                                    position: 'insideLeft',
                                                    fill: '#cbd5f5',
                                                    fontSize: 10,
                                                }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#020617',
                                                    border: '1px solid #1e293b',   // ✅ 이렇게!
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                }}
                                                formatter={(value, name) => {
                                                    if (name === 'sys') return [`${value} mmHg`, '수축기'];
                                                    if (name === 'dia') return [`${value} mmHg`, '이완기'];
                                                    return [value, name];
                                                }}
                                                labelFormatter={(label, payload) => {
                                                    const p = payload?.[0]?.payload as ChartPoint | undefined;
                                                    return p ? `${label} (${p.state ?? 'state 없음'})` : label;
                                                }}
                                            />

                                            <Legend
                                                formatter={(value) =>
                                                    value === 'sys'
                                                        ? '수축기'
                                                        : value === 'dia'
                                                            ? '이완기'
                                                            : value
                                                }
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="sys"
                                                stroke="#38bdf8"
                                                strokeWidth={2}
                                                dot={{ r: 2 }}
                                                name="수축기"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="dia"
                                                stroke="#f97316"
                                                strokeWidth={2}
                                                dot={{ r: 2 }}
                                                name="이완기"
                                                connectNulls
                                            />
                                        </LineChart>
                                    </div>
                                </div>

                                <p className="mt-3 text-xs text-slate-400">
                                    점 하나가 한 번의 측정을 의미해. 수축기(위값)와 이완기(아랫값)의
                                    변화를 함께 볼 수 있어.
                                </p>
                            </section>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
