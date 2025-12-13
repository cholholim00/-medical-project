// app/records/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/authStorage';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

type RecordType = 'blood_pressure' | 'blood_sugar';

export default function NewRecordPage() {
    const router = useRouter();

    const [needLogin, setNeedLogin] = useState(false);

    const [type, setType] = useState<RecordType>('blood_pressure');
    const [datetime, setDatetime] = useState<string>(''); // ISO string (datetime-local)
    const [sys, setSys] = useState<string>(''); // 수축기
    const [dia, setDia] = useState<string>(''); // 이완기
    const [bloodSugar, setBloodSugar] = useState<string>(''); // 혈당
    const [state, setState] = useState<string>(''); // 상태 라벨
    const [memo, setMemo] = useState<string>(''); // 메모

    // 라이프스타일 필드
    const [sleepHours, setSleepHours] = useState<string>('7');
    const [exercise, setExercise] = useState<boolean>(false);
    const [stressLevel, setStressLevel] = useState<number>(3);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 진입 시 로그인 여부 확인
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
        } else {
            // 기본 datetime을 지금으로 설정
            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16); // "YYYY-MM-DDTHH:mm"
            setDatetime(local);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setError('기록을 추가하려면 로그인이 필요합니다.');
            return;
        }

        // 간단한 유효성 검사
        if (!datetime) {
            setError('측정한 날짜/시간을 입력해 주세요.');
            return;
        }

        if (type === 'blood_pressure') {
            if (!sys || !dia) {
                setError('혈압(수축기/이완기) 값을 모두 입력해 주세요.');
                return;
            }
        } else {
            if (!bloodSugar) {
                setError('혈당 값을 입력해 주세요.');
                return;
            }
        }

        try {
            setLoading(true);

            const body: any = {
                type,
                datetime: new Date(datetime).toISOString(),
                state: state || null,
                memo: memo || null,
            };

            if (type === 'blood_pressure') {
                body.value1 = Number(sys);
                body.value2 = Number(dia);
            } else {
                body.value1 = Number(bloodSugar);
            }

            // 라이프스타일 값들
            body.sleepHours = sleepHours ? Number(sleepHours) : null;
            body.exercise = exercise;
            body.stressLevel = stressLevel || null;

            const res = await fetch(`${API_BASE}/api/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `기록 추가 실패: ${res.status}`);
            }

            // 성공하면 대시보드로 이동
            router.push('/');
        } catch (err: any) {
            setError(err.message ?? '기록을 추가하는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-xl p-6 space-y-6">
                {/* 헤더 */}
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">📝 새 건강 기록 추가</h1>
                        <p className="text-sm text-slate-300">
                            혈압 또는 혈당과 함께 수면, 운동, 스트레스 상태까지 한 번에 기록해요.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                    >
                        ⬅ 대시보드로
                    </Link>
                </header>

                {/* 로그인 안내 */}
                {needLogin && (
                    <section className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                        <p className="text-sm text-slate-300">
                            건강 기록을 저장하려면 먼저 로그인해 주세요.
                        </p>
                        <div className="flex gap-2">
                            <Link
                                href="/auth/login"
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold"
                            >
                                로그인
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold"
                            >
                                회원가입
                            </Link>
                        </div>
                        {error && (
                            <p className="text-xs text-red-400 whitespace-pre-line">
                                {error}
                            </p>
                        )}
                    </section>
                )}

                {/* 로그인 된 경우에만 폼 보여주기 */}
                {!needLogin && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* 기록 종류 */}
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-slate-200">
                                1. 기록 종류
                            </h2>
                            <div className="flex gap-2 text-sm">
                                <button
                                    type="button"
                                    onClick={() => setType('blood_pressure')}
                                    className={`flex-1 px-3 py-2 rounded-xl border ${
                                        type === 'blood_pressure'
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                            : 'bg-slate-900 border-slate-700 text-slate-300'
                                    }`}
                                >
                                    혈압
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('blood_sugar')}
                                    className={`flex-1 px-3 py-2 rounded-xl border ${
                                        type === 'blood_sugar'
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                            : 'bg-slate-900 border-slate-700 text-slate-300'
                                    }`}
                                >
                                    혈당
                                </button>
                            </div>
                        </section>

                        {/* 측정 시간 */}
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-slate-200">
                                2. 측정 날짜/시간
                            </h2>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                value={datetime}
                                onChange={(e) => setDatetime(e.target.value)}
                                required
                            />
                        </section>

                        {/* 혈압 / 혈당 입력 */}
                        {type === 'blood_pressure' ? (
                            <section className="space-y-2">
                                <h2 className="text-sm font-semibold text-slate-200">
                                    3. 혈압 (mmHg)
                                </h2>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-slate-400">수축기 (위)</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                            placeholder="예: 120"
                                            value={sys}
                                            onChange={(e) => setSys(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-slate-400">이완기 (아래)</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                            placeholder="예: 80"
                                            value={dia}
                                            onChange={(e) => setDia(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <section className="space-y-2">
                                <h2 className="text-sm font-semibold text-slate-200">
                                    3. 혈당 (mg/dL)
                                </h2>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                    placeholder="예: 95"
                                    value={bloodSugar}
                                    onChange={(e) => setBloodSugar(e.target.value)}
                                    required
                                />
                            </section>
                        )}

                        {/* 상태 / 메모 */}
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-slate-200">
                                4. 상태 & 메모 (선택)
                            </h2>
                            <input
                                type="text"
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                placeholder="예: 약 먹기 전 / 두통 약간 / 카페인 많이 섭취함"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                            />
                            <textarea
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm min-h-[80px]"
                                placeholder="자세한 메모가 필요하면 적어 주세요. (선택)"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                            />
                        </section>

                        {/* 라이프스타일 영역 */}
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-200">
                                5. 라이프스타일 (선택이지만, 인사이트에 도움돼요)
                            </h2>

                            {/* 수면 시간 */}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">
                                    어제 총 수면 시간 (시간 기준)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={24}
                                    step={0.5}
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                    placeholder="예: 6.5"
                                    value={sleepHours}
                                    onChange={(e) => setSleepHours(e.target.value)}
                                />
                            </div>

                            {/* 운동 여부 */}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">오늘 운동 여부</label>
                                <div className="flex gap-2 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setExercise(true)}
                                        className={`flex-1 px-3 py-2 rounded-xl border ${
                                            exercise
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                                : 'bg-slate-900 border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        운동함
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExercise(false)}
                                        className={`flex-1 px-3 py-2 rounded-xl border ${
                                            !exercise
                                                ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                                                : 'bg-slate-900 border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        운동 안 함
                                    </button>
                                </div>
                            </div>

                            {/* 스트레스 지수 */}
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">
                                    오늘 전반적인 스트레스 정도 (1~5)
                                </label>
                                <select
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                                    value={stressLevel}
                                    onChange={(e) => setStressLevel(Number(e.target.value))}
                                >
                                    <option value={1}>1 - 거의 없음</option>
                                    <option value={2}>2 - 조금 있음</option>
                                    <option value={3}>3 - 보통</option>
                                    <option value={4}>4 - 꽤 높음</option>
                                    <option value={5}>5 - 매우 높음</option>
                                </select>
                            </div>
                        </section>

                        {/* 에러 메시지 */}
                        {error && (
                            <p className="text-sm text-red-400 whitespace-pre-line">{error}</p>
                        )}

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
                        >
                            {loading ? '저장 중...' : '기록 저장하기'}
                        </button>

                        <p className="text-[11px] text-slate-500">
                            기록한 내용은 나중에 대시보드, 차트, AI 코치, 라이프스타일 인사이트에서
                            함께 분석에 사용됩니다.
                        </p>
                    </form>
                )}
            </div>
        </main>
    );
}
