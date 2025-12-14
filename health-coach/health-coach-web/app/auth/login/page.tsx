// app/auth/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setAuth } from '@/lib/authStorage';  // 🔹 authStorage 사용

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 이미 로그인되어 있으면 / 로 보내기
    useEffect(() => {
        const token = getToken();
        if (token) {
            router.replace('/');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `로그인 실패: ${res.status}`);
            }

            const json = (await res.json()) as {
                token: string;
                user: { id: number; email: string; name?: string | null };
            };

            // 🔹 여기서 공통 유틸로 토큰 + 유저 저장
            setAuth(json.token, json.user);

            router.push('/');
        } catch (err: any) {
            setError(err.message ?? '로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-md p-6 space-y-6">
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">로그인</h1>
                    <p className="text-sm text-slate-300">
                        AI 혈압 코치 대시보드에 로그인해서 내 기록과 코칭을 확인해요.
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-300">이메일</label>
                        <input
                            type="email"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-slate-300">비밀번호</label>
                        <input
                            type="password"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 whitespace-pre-line">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold disabled:opacity-60"
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                <p className="text-xs text-slate-400">
                    아직 계정이 없으신가요?{' '}
                    <a
                        href="/auth/register"
                        className="text-emerald-400 hover:underline"
                    >
                        회원가입 하기
                    </a>
                </p>
            </div>
        </main>
    );
}
