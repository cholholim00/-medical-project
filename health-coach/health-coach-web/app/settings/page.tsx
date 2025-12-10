// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:4000'; // 나중에 배포 시 바꿀 예정

type UserProfile = {
    id: number;
    userId: number;
    targetSys: number;
    targetDia: number;
};

export default function SettingsPage() {
    const [targetSys, setTargetSys] = useState<number | ''>('');
    const [targetDia, setTargetDia] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            setMessage(null);

            const res = await fetch(`${API_BASE}/api/user/profile`);
            if (res.status === 404) {
                // 아직 프로필 없음 → 기본 추천값 세팅
                setTargetSys(130);
                setTargetDia(85);
                return;
            }
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const json = (await res.json()) as UserProfile;
            setTargetSys(json.targetSys);
            setTargetDia(json.targetDia);
        } catch (err: any) {
            setError(err.message ?? '프로필 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (targetSys === '' || targetDia === '') return;

        try {
            setSaving(true);
            setError(null);
            setMessage(null);

            const res = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetSys: Number(targetSys),
                    targetDia: Number(targetDia),
                }),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `API error: ${res.status}`);
            }

            setMessage('목표 혈압이 저장되었습니다.');
        } catch (err: any) {
            setError(err.message ?? '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-xl p-6 space-y-6">
                <header>
                    <h1 className="text-2xl font-bold">⚙️ 목표 혈압 설정</h1>
                    <p className="text-sm text-slate-300 mt-1">
                        이 값은 대시보드와 AI 코치에서 참고 기준으로 사용돼. 의료적인 진단이
                        아니라, 나만의 목표 범위를 정하는 용도야.
                    </p>
                    <Link
                        href="/"
                        className="text-sm text-slate-300 hover:text-slate-100 underline"
                    >
                        ← 대시보드로
                    </Link>
                </header>

                <section className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    {loading ? (
                        <p className="text-sm text-slate-300">불러오는 중...</p>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex flex-col gap-3">
                                <label className="text-sm text-slate-200">
                                    목표 혈압 (수축기 / 이완기)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm"
                                        placeholder="수축기 (예: 130)"
                                        value={targetSys}
                                        onChange={(e) =>
                                            setTargetSys(e.target.value === '' ? '' : Number(e.target.value))
                                        }
                                    />
                                    <span className="self-center text-slate-400">/</span>
                                    <input
                                        type="number"
                                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm"
                                        placeholder="이완기 (예: 85)"
                                        value={targetDia}
                                        onChange={(e) =>
                                            setTargetDia(e.target.value === '' ? '' : Number(e.target.value))
                                        }
                                    />
                                    <span className="self-center text-xs text-slate-400">mmHg</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    예를 들어 130 / 85 mmHg는, 내가 관리 목표로 삼고 싶은 상한선을
                                    의미해. 실제 건강 상태에 대한 판단은 반드시 의료 전문가와
                                    상의해야 해.
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">에러: {error}</p>
                            )}
                            {message && (
                                <p className="text-sm text-emerald-400">{message}</p>
                            )}

                            <button
                                type="submit"
                                disabled={saving || targetSys === '' || targetDia === ''}
                                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
                            >
                                {saving ? '저장 중...' : '저장하기'}
                            </button>
                        </form>
                    )}
                </section>

                <p className="text-[11px] text-slate-500">
                    ※ 이 앱에서 제공하는 정보는 건강 관리를 스스로 이해하는 데 도움을 주기
                    위한 참고용이야. 정확한 진단이나 치료 결정은 의료 전문가와 꼭 상담해줘.
                </p>
            </div>
        </main>
    );
}
