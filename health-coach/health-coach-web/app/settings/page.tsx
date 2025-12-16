// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken, clearAuth } from '@/lib/authStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

type UserProfile = {
    id: number;
    userId: number;
    targetSys: number;
    targetDia: number;
};

export default function SettingsPage() {
    const router = useRouter();

    const [needLogin, setNeedLogin] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [targetSys, setTargetSys] = useState<string>('');
    const [targetDia, setTargetDia] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchProfile = async (token: string) => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_BASE}/api/user/profile`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.status === 404) {
                // 아직 설정 안한 경우
                setProfile(null);
                setTargetSys('');
                setTargetDia('');
                return;
            }

            if (!res.ok) {
                throw new Error(`profile API error: ${res.status}`);
            }

            const json = (await res.json()) as UserProfile | null;
            setProfile(json);
            if (json) {
                setTargetSys(String(json.targetSys));
                setTargetDia(String(json.targetDia));
            }
        } catch (err: any) {
            setError(
                err.message ?? '목표 혈압 정보를 불러오는 중 오류가 발생했습니다.',
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

        fetchProfile(token);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setError('목표 혈압을 저장하려면 먼저 로그인해야 합니다.');
            return;
        }

        if (!targetSys || !targetDia) {
            setError('수축기/이완기 목표 값을 모두 입력해 주세요.');
            return;
        }

        try {
            setSaving(true);

            const body = {
                targetSys: Number(targetSys),
                targetDia: Number(targetDia),
            };

            const res = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `목표 혈압 저장 실패: ${res.status}`);
            }

            const json = (await res.json()) as UserProfile;
            setProfile(json);
            setSuccess('목표 혈압이 저장되었습니다.');
        } catch (err: any) {
            setError(
                err.message ?? '목표 혈압을 저장하는 중 오류가 발생했습니다.',
            );
        } finally {
            setSaving(false);
        }
    };

    // 🔥 회원 탈퇴
    const handleDeleteAccount = async () => {
        setDeleteError(null);

        const token = getToken();
        if (!token) {
            setNeedLogin(true);
            setDeleteError('회원 탈퇴를 하려면 먼저 로그인해야 합니다.');
            return;
        }

        const ok = window.confirm(
            '정말 회원 탈퇴를 진행할까요?\n\n' +
            '• 저장된 혈압/혈당 기록\n' +
            '• AI 코치 로그\n' +
            '• 목표 혈압 설정\n\n' +
            '이 모두 완전히 삭제되고 복구할 수 없습니다.',
        );
        if (!ok) return;

        try {
            setDeleting(true);

            const res = await fetch(`${API_BASE}/api/auth/me`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `회원 탈퇴 실패: ${res.status}`);
            }

            // 로컬 인증 정보 제거
            clearAuth();

            alert('회원 탈퇴가 완료되었습니다. 지금까지 이용해 주셔서 감사합니다.');
            router.push('/auth/register');
        } catch (err: any) {
            setDeleteError(
                err.message ?? '회원 탈퇴 처리 중 오류가 발생했습니다.',
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-3xl px-4 py-6 md:px-8 md:py-10 space-y-6 md:space-y-8">
                <header className="flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            🎯 목표 혈압 & 계정 설정
                        </h1>
                        <p className="text-xs md:text-sm text-slate-300">
                            AI 코치가 참고할 나만의 목표 혈압과 계정 정보를 관리하는 화면이에요.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold shadow-sm"
                    >
                        ⬅ 대시보드로
                    </Link>
                </header>

                {needLogin ? (
                    <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-lg shadow-slate-950/40">
                        <p className="text-sm text-slate-200">
                            목표 혈압을 설정하거나 계정을 관리하려면 로그인이 필요합니다.
                        </p>
                        <div className="mt-4 flex gap-2">
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
                    <div className="space-y-6 md:space-y-7">
                        {/* 목표 혈압 카드 */}
                        <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-lg shadow-slate-950/40 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-sm md:text-base">
                                        내 목표 혈압 설정
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        여기 설정한 값은 대시보드와 AI 코치가 참고하는 기준선으로 사용돼요.
                                    </p>
                                </div>
                            </div>

                            {loading ? (
                                <p className="text-sm text-slate-300">불러오는 중...</p>
                            ) : (
                                <>
                                    {profile && (
                                        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                                            <p>
                                                현재 목표:{' '}
                                                <span className="font-semibold text-slate-100">
                          {profile.targetSys} / {profile.targetDia} mmHg
                        </span>
                                            </p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSave} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs md:text-sm text-slate-300">
                                                    목표 수축기 (위 혈압)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={targetSys}
                                                    onChange={e => setTargetSys(e.target.value)}
                                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs md:text-sm text-slate-300">
                                                    목표 이완기 (아래 혈압)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={targetDia}
                                                    onChange={e => setTargetDia(e.target.value)}
                                                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <p className="text-sm text-red-400 whitespace-pre-line">
                                                {error}
                                            </p>
                                        )}
                                        {success && (
                                            <p className="text-sm text-emerald-400 whitespace-pre-line">
                                                {success}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            {saving ? '저장 중...' : '목표 혈압 저장'}
                                        </button>
                                    </form>

                                    <p className="text-[11px] text-slate-500 mt-2">
                                        ※ 이 값은 AI 코치가 참고하는 목표 범위일 뿐, 실제 진단 기준은 아니에요.
                                        정확한 목표 혈압은 의료 전문가와 상의해 주세요.
                                    </p>
                                </>
                            )}
                        </section>

                        {/* 계정 관리 + 회원 탈퇴 카드 */}
                        <section className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-lg shadow-slate-950/40 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-sm md:text-base">
                                        계정 관리 · 회원 탈퇴
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        이 서비스 이용을 중단하고 싶다면 여기에서 회원 탈퇴를 진행할 수 있어요.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                                <p className="text-xs text-red-200 font-medium">
                                    ⚠ 회원 탈퇴 시 주의사항
                                </p>
                                <ul className="text-[11px] text-red-100 list-disc list-inside space-y-0.5">
                                    <li>저장된 혈압·혈당 기록이 모두 삭제됩니다.</li>
                                    <li>AI 코치 대화/로그가 모두 삭제됩니다.</li>
                                    <li>목표 혈압 등 개인 설정 정보도 함께 삭제됩니다.</li>
                                    <li>삭제 후에는 데이터를 복구할 수 없습니다.</li>
                                </ul>
                            </div>

                            {deleteError && (
                                <p className="text-xs text-red-400 whitespace-pre-line">
                                    {deleteError}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className="w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            >
                                {deleting ? '회원 탈퇴 진행 중...' : '🗑 내 계정 완전 삭제하기'}
                            </button>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}