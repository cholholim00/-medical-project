// app/records/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'http://localhost:5001';

export default function NewRecordPage() {
    const router = useRouter();

    const [datetime, setDatetime] = useState(
        new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
    );
    const [sys, setSys] = useState(''); // 수축기
    const [dia, setDia] = useState(''); // 이완기
    const [pulse, setPulse] = useState(''); // 맥박(선택)
    const [stateText, setStateText] = useState(''); // 상태 라벨
    const [memo, setMemo] = useState('');

    // 라이프스타일
    const [sleepHours, setSleepHours] = useState(''); // 수면 시간(시간)
    const [exercise, setExercise] = useState<'yes' | 'no' | ''>(''); // 운동 여부
    const [stressLevel, setStressLevel] = useState('3'); // 1~5 기본 3

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSubmitting(true);
            setError(null);

            const sysNum = Number(sys);
            const diaNum = Number(dia);

            if (Number.isNaN(sysNum) || Number.isNaN(diaNum)) {
                setError('수축기/이완기 혈압을 숫자로 입력해 주세요.');
                setSubmitting(false);
                return;
            }

            const body: any = {
                type: 'blood_pressure',
                datetime: new Date(datetime).toISOString(),
                value1: sysNum,
                value2: diaNum,
            };

            if (pulse.trim() !== '') {
                const p = Number(pulse);
                if (!Number.isNaN(p)) {
                    body.pulse = p;
                }
            }

            if (stateText.trim() !== '') {
                body.state = stateText.trim();
            }

            if (memo.trim() !== '') {
                body.memo = memo.trim();
            }

            // 라이프스타일 필드들 추가
            if (sleepHours.trim() !== '') {
                const s = Number(sleepHours);
                if (!Number.isNaN(s) && s > 0) {
                    body.sleepHours = s;
                }
            }

            if (exercise === 'yes') {
                body.exercise = true;
            } else if (exercise === 'no') {
                body.exercise = false;
            }

            if (stressLevel.trim() !== '') {
                const s = Number(stressLevel);
                if (!Number.isNaN(s) && s > 0) {
                    body.stressLevel = s;
                }
            }

            const res = await fetch(`${API_BASE}/api/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `API error: ${res.status}`);
            }

            // 성공하면 메인 대시보드로 이동
            router.push('/');
        } catch (err: any) {
            setError(err.message ?? '기록 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-2xl p-6 space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">➕ 혈압 기록 추가</h1>
                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="text-sm text-slate-300 hover:text-slate-100 underline"
                    >
                        ← 대시보드로 돌아가기
                    </button>
                </header>

                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 기본 측정값 */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="block text-sm text-slate-300">
                                    측정 일시
                                </label>
                                <input
                                    type="datetime-local"
                                    value={datetime}
                                    onChange={(e) => setDatetime(e.target.value)}
                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm text-slate-300">
                                    혈압 (수축기 / 이완기)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="수축기 (위)"
                                        value={sys}
                                        onChange={(e) => setSys(e.target.value)}
                                        className="w-1/2 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                    />
                                    <span>/</span>
                                    <input
                                        type="number"
                                        placeholder="이완기 (아래)"
                                        value={dia}
                                        onChange={(e) => setDia(e.target.value)}
                                        className="w-1/2 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 선택 필드: 맥박, 상태, 메모 */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="block text-sm text-slate-300">맥박 (선택)</label>
                                <input
                                    type="number"
                                    placeholder="예: 70"
                                    value={pulse}
                                    onChange={(e) => setPulse(e.target.value)}
                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm text-slate-300">
                                    상태 라벨 (예: 아침 / 저녁 / 두통 / 안정 시)
                                </label>
                                <input
                                    type="text"
                                    placeholder="간단한 상태 설명"
                                    value={stateText}
                                    onChange={(e) => setStateText(e.target.value)}
                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm text-slate-300">메모 (선택)</label>
                            <textarea
                                rows={3}
                                placeholder="오늘 컨디션, 먹은 약/음식, 특별한 일 등을 기록해 두면 좋아요."
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                            />
                        </div>

                        {/* 라이프스타일 섹션 */}
                        <div className="mt-4 border-t border-slate-800 pt-4 space-y-4">
                            <h2 className="text-sm font-semibold text-slate-200">
                                라이프스타일 (선택 입력)
                            </h2>

                            <div className="grid gap-4 md:grid-cols-3">
                                {/* 수면 시간 */}
                                <div className="space-y-2">
                                    <label className="block text-sm text-slate-300">
                                        수면 시간 (시간)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.5}
                                        placeholder="예: 6.5"
                                        value={sleepHours}
                                        onChange={(e) => setSleepHours(e.target.value)}
                                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                    />
                                </div>

                                {/* 운동 여부 */}
                                <div className="space-y-2">
                                    <label className="block text-sm text-slate-300">
                                        오늘 운동했나요?
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExercise('yes')}
                                            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                                                exercise === 'yes'
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                    : 'bg-slate-950 border-slate-700 text-slate-300'
                                            }`}
                                        >
                                            했다
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExercise('no')}
                                            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                                                exercise === 'no'
                                                    ? 'bg-slate-500/20 border-slate-500 text-slate-200'
                                                    : 'bg-slate-950 border-slate-700 text-slate-300'
                                            }`}
                                        >
                                            안 했다
                                        </button>
                                    </div>
                                </div>

                                {/* 스트레스 정도 */}
                                <div className="space-y-2">
                                    <label className="block text-sm text-slate-300">
                                        오늘 스트레스 정도 (1~5)
                                    </label>
                                    <select
                                        value={stressLevel}
                                        onChange={(e) => setStressLevel(e.target.value)}
                                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                                    >
                                        <option value="1">1 - 거의 없음</option>
                                        <option value="2">2 - 조금 있음</option>
                                        <option value="3">3 - 보통</option>
                                        <option value="4">4 - 다소 높음</option>
                                        <option value="5">5 - 매우 높음</option>
                                    </select>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500">
                                수면·운동·스트레스 정보는 AI 코치 요약 페이지에서 오늘 컨디션과
                                혈압을 함께 설명해 줄 때 활용돼요. 모두 선택 입력이니, 부담 없이
                                가능한 날에만 적어도 괜찮아요.
                            </p>
                        </div>

                        {/* 에러 & 버튼 */}
                        {error && (
                            <p className="text-sm text-red-400">
                                에러: {error}
                            </p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
                            >
                                {submitting ? '저장 중...' : '기록 저장하기'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
