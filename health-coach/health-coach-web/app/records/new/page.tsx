// app/records/new/page.tsx
'use client';

import { FormEvent, useState } from 'react';

const API_BASE = 'http://localhost:4000';

type RecordType = 'blood_sugar' | 'blood_pressure';

export default function NewRecordPage() {
    const [type, setType] = useState<RecordType>('blood_pressure');
    const [value1, setValue1] = useState('');
    const [value2, setValue2] = useState('');
    const [state, setState] = useState('rest');
    const [memo, setMemo] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const body: any = {
                type,
                value1: Number(value1),
                state,
                memo,
            };

            if (type === 'blood_pressure') {
                body.value2 = Number(value2);
            }

            const res = await fetch(`${API_BASE}/api/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `API error: ${res.status}`);
            }

            setMessage('기록이 저장되었습니다!');
            setValue1('');
            setValue2('');
            setMemo('');
        } catch (err: any) {
            setMessage(`에러: ${err.message ?? '알 수 없는 오류'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-xl p-6">
                <h1 className="text-2xl font-bold mb-2">➕ 새 기록 추가</h1>
                <p className="text-sm text-slate-300 mb-4">
                    혈압이나 혈당을 직접 입력해서 백엔드에 저장해볼 수 있어.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-4 rounded-xl bg-slate-900 border border-slate-800"
                >
                    {/* 타입 선택 */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">기록 종류</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as RecordType)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="blood_pressure">혈압</option>
                            <option value="blood_sugar">혈당</option>
                        </select>
                    </div>

                    {/* 값 입력 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">
                                {type === 'blood_pressure' ? '수축기(mmHg)' : '값'}
                            </label>
                            <input
                                type="number"
                                value={value1}
                                onChange={(e) => setValue1(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {type === 'blood_pressure' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium">이완기(mmHg)</label>
                                <input
                                    type="number"
                                    value={value2}
                                    onChange={(e) => setValue2(e.target.value)}
                                    required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* 상태 */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">상태</label>
                        <select
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="morning">아침(morning)</option>
                            <option value="after_meal">식후(after_meal)</option>
                            <option value="rest">휴식(rest)</option>
                            <option value="stress">스트레스(stress)</option>
                            <option value="exercise">운동 후(exercise)</option>
                        </select>
                    </div>

                    {/* 메모 */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium">메모(선택)</label>
                        <textarea
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                            placeholder="예: 오늘은 조금 피곤한 상태에서 측정"
                        />
                    </div>

                    {/* 저장 버튼 */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold disabled:opacity-60"
                    >
                        {saving ? '저장 중...' : '저장하기'}
                    </button>

                    {message && <p className="text-sm mt-2">{message}</p>}
                </form>
            </div>
        </main>
    );
}
