// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    getToken,
    getUser,
    clearAuth,
    type StoredUser,
} from '@/lib/authStorage';

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

type HealthRecord = {
    id: number;
    datetime: string;
    type: 'blood_sugar' | 'blood_pressure';
    value1: number;
    value2?: number;
    state?: string | null;
    memo?: string | null;
};

type Level = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'unknown';

function classifyBloodPressure(sys: number | null, dia: number | null): Level {
    if (sys == null || dia == null) return 'unknown';

    if (sys < 120 && dia < 80) return 'normal';
    if (sys >= 120 && sys <= 129 && dia < 80) return 'elevated';
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'stage1';
    if (sys >= 140 || dia >= 90) return 'stage2';

    return 'unknown';
}

function levelText(level: Level): string {
    switch (level) {
        case 'normal':
            return '정상 범위';
        case 'elevated':
            return '주의 (상승)';
        case 'stage1':
            return '고혈압 1단계 의심';
        case 'stage2':
            return '고혈압 2단계 의심';
        default:
            return '분류 불가';
    }
}

function levelColor(level: Level): string {
    switch (level) {
        case 'normal':
            return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60';
        case 'elevated':
            return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60';
        case 'stage1':
            return 'bg-orange-500/20 text-orange-300 border-orange-500/60';
        case 'stage2':
            return 'bg-red-500/20 text-red-300 border-red-500/60';
        default:
            return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
}

export default function Home() {
    const router = useRouter();

    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [needLogin, setNeedLogin] = useState(false);
    const [user, setUser] = useState<StoredUser | null>(null);

    const handleLogout = () => {
        clearAuth();
        setUser(null);
        setSummary(null);
        setRecords([]);
        setNeedLogin(true);
        setError(null);
        router.push('/auth/login');
    };

    // 토큰을 인자로 받아서 데이터 로딩
    const fetchData = async (token: string) => {
        try {
            setLoading(true);
            setError(null);

            const [summaryRes, recordsRes] = await Promise.all([
                fetch(`${API_BASE}/api/records/stats/summary?rangeDays=7`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }),
                fetch(`${API_BASE}/api/records?type=blood_pressure`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }),
            ]);

            if (!summaryRes.ok) {
                throw new Error(`summary API error: ${summaryRes.status}`);
            }
            if (!recordsRes.ok) {
                throw new Error(`records API error: ${recordsRes.status}`);
            }

            const summaryJson = (await summaryRes.json()) as SummaryResponse;
            const recordsJson = (await recordsRes.json()) as HealthRecord[];

            const sorted = [...recordsJson].sort(
                (a, b) =>
                    new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
            );

            setSummary(summaryJson);
            setRecords(sorted.slice(0, 10));
        } catch (err: any) {
            setError(err.message ?? '알 수 없는 오류');
        } finally {
            setLoading(false);
        }
    };

    // 샘플 데이터 생성 (로그인 필요)
    const handleSeed = async () => {
        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setError('샘플 데이터를 생성하려면 먼저 로그인해야 합니다.');
            return;
        }

        try {
            setSeeding(true);
            setError(null);
            const res = await fetch(`${API_BASE}/api/records/dev/seed-bp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    days: 14,
                    perDay: 5,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `seed API error: ${res.status}`);
            }

            await fetchData(token);
        } catch (err: any) {
            setError(err.message ?? '샘플 데이터 생성 중 오류');
        } finally {
            setSeeding(false);
        }
    };

    // 전체 삭제 (로그인 필요)
    const handleClearAll = async () => {
        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setError('모든 기록을 삭제하려면 먼저 로그인해야 합니다.');
            return;
        }

        const ok = window.confirm(
            '정말 모든 혈압 기록을 삭제할까요?\n(샘플 데이터뿐 아니라 지금까지 넣은 실제 기록도 모두 지워집니다.)',
        );
        if (!ok) return;

        try {
            setClearing(true);
            setError(null);

            const res = await fetch(`${API_BASE}/api/records/dev/clear-all`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `clear API error: ${res.status}`);
            }

            await fetchData(token);
        } catch (err: any) {
            setError(err.message ?? '데이터 삭제 중 오류가 발생했습니다.');
        } finally {
            setClearing(false);
        }
    };

    // 마운트 시 토큰 확인 → 없으면 로그인 안내, 있으면 데이터 로딩
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setLoading(false);
            return;
        }

        const u = getUser();
        if (u) {
            setUser(u);
        }

        fetchData(token);
    }, [router]);

    const latest = records.length > 0 ? records[0] : null;
    const latestSys =
        latest && typeof latest.value1 === 'number' ? latest.value1 : null;
    const latestDia =
        latest && typeof latest.value2 === 'number' ? latest.value2 : null;

    const latestLevel = classifyBloodPressure(latestSys, latestDia);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-5xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">🩺 AI 혈압 코치 대시보드</h1>
                        <p className="text-sm text-slate-300">
                            백엔드에서 계산한 통계를 한눈에 보고, 기록도 바로 추가할 수 있어.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {/* 로그인 상태 표시 영역 */}
                        <div className="text-xs text-slate-300 flex items-center gap-2">
                            {user ? (
                                <>
                                    <span>{user.name ?? user.email} 님, 환영해요 👋</span>
                                    <button
                                        onClick={handleLogout}
                                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-semibold"
                                    >
                                        로그아웃
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span>로그인이 필요합니다.</span>
                                    <Link
                                        href="/auth/login"
                                        className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[11px] font-semibold"
                                    >
                                        로그인
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* 네비게이션 버튼들 */}
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/records/new"
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold"
                            >
                                ➕ 혈압 기록 추가하기
                            </Link>
                            <Link
                                href="/mobile/checkin"
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
                            >
                                📱 모바일 체크인
                            </Link>
                            <Link
                                href="/ai-coach"
                                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
                            >
                                🤖 AI 코치 요약 보기
                            </Link>
                            <Link
                                href="/charts"
                                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold"
                            >
                                📈 혈압 추이 차트
                            </Link>
                            <Link
                                href="/settings"
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
                            >
                                🎯 목표 혈압 설정
                            </Link>
                            <Link
                                href="/records"
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
                            >
                                📋 전체 기록 관리
                            </Link>
                            <Link
                                href="/insights"
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-semibold"
                            >
                                📊 라이프스타일 인사이트
                            </Link>
                        </div>
                    </div>
                </header>

                {/* 샘플 생성 / 전체 삭제 섹션 */}
                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm text-slate-300">
                        테스트용 데이터가 필요하면 샘플을 생성해서 그래프와 인사이트를 바로
                        확인할 수 있어요. 필요하다면 아래에서 모든 기록을 한 번에
                        초기화할 수도 있어요.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={handleSeed}
                            disabled={seeding || clearing}
                            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-sm font-semibold disabled:opacity-60"
                        >
                            {seeding ? '생성 중...' : '🧪 샘플 데이터 생성'}
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={clearing || seeding}
                            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-sm font-semibold disabled:opacity-60"
                        >
                            {clearing ? '삭제 중...' : '🧹 모든 기록 삭제'}
                        </button>
                    </div>
                </section>

                {/* 로그인 여부에 따라 */}
                {needLogin ? (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-sm text-slate-300">
                            이 대시보드는 로그인 후에만 볼 수 있어요.
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
                        {loading && <p>불러오는 중...</p>}
                        {error && <p className="text-red-400 text-sm">에러: {error}</p>}

                        {!loading && !error && (
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* 왼쪽: 최근 상태 + 평균 */}
                                <section className="md:col-span-1 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                    <h2 className="font-semibold mb-1">최근 7일 요약</h2>

                                    {/* 최근 측정값 카드 */}
                                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                                        <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        가장 최근 혈압
                      </span>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${levelColor(
                                                    latestLevel,
                                                )}`}
                                            >
                        {latest ? levelText(latestLevel) : '기록 없음'}
                      </span>
                                        </div>
                                        <div className="text-lg font-bold">
                                            {latestSys !== null && latestDia !== null
                                                ? `${latestSys} / ${latestDia} mmHg`
                                                : '기록 없음'}
                                        </div>
                                        {latest && (
                                            <p className="text-xs text-slate-400">
                                                상태:{' '}
                                                <span className="font-medium text-slate-200">
                          {latest.state ?? '표시 없음'}
                        </span>
                                            </p>
                                        )}
                                    </div>

                                    {/* 평균 요약 */}
                                    {summary ? (
                                        <div className="text-sm text-slate-300 space-y-3">
                                            <div>
                                                <div className="text-xs text-slate-400 mb-1">
                                                    최근 7일 평균 혈압
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
                                                    최근 7일 평균 혈당
                                                </div>
                                                <div className="text-lg font-bold">
                                                    {summary.blood_sugar.avg !== null
                                                        ? `${Math.round(
                                                            summary.blood_sugar.avg,
                                                        )} mg/dL`
                                                        : '데이터 없음'}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    측정 횟수: {summary.blood_sugar.count}회
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">
                                            아직 통계 데이터가 없습니다.
                                        </p>
                                    )}

                                    <p className="text-[11px] text-slate-500">
                                        ※ 이 분류는 일반적인 혈압 범위를 참고한 것이며, 의료적 진단이나
                                        치료 지시가 아닙니다. 걱정되는 수치가 계속된다면 의료 전문가와
                                        상담하세요.
                                    </p>
                                </section>

                                {/* 오른쪽: 최근 기록 리스트 */}
                                <section className="md:col-span-2 p-4 rounded-xl bg-slate-900 border border-slate-800">
                                    <h2 className="font-semibold mb-2">
                                        최근 혈압 기록 (최대 10개)
                                    </h2>
                                    {records.length === 0 ? (
                                        <p className="text-sm text-slate-400">
                                            아직 혈압 기록이 없어요. 위의 &quot;혈압 기록 추가하기&quot;
                                            버튼을 눌러서 첫 기록을 추가해보세요.
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
                                                        상태
                                                    </th>
                                                    <th className="border border-slate-700 px-2 py-1">
                                                        메모
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {records.map((r) => {
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
                                                            <td className="border border-slate-800 px-2 py-1 text-center">
                                                                {r.value1}
                                                                {r.value2 !== undefined
                                                                    ? ` / ${r.value2}`
                                                                    : ''}
                                                            </td>
                                                            <td className="border border-slate-800 px-2 py-1 text-center">
                                                                {r.state ?? '-'}
                                                            </td>
                                                            <td className="border border-slate-800 px-2 py-1">
                                                                {r.memo ?? ''}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
