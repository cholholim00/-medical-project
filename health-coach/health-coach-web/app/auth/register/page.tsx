// app/auth/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001';

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 이미 로그인 되어 있으면 / 로 보내기
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('hc_token');
            if (token) {
                router.replace('/');
            }
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirm) {
            setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `회원가입 실패: ${res.status}`);
            }

            const json = (await res.json()) as {
                token: string;
                user: { id: number; email: string; name?: string | null };
            };

            // 가입 후 자동 로그인 시키고 싶으면 토큰 저장
            if (typeof window !== 'undefined') {
                localStorage.setItem('hc_token', json.token);
                localStorage.setItem('hc_user', JSON.stringify(json.user));
            }

            // 바로 대시보드로 보내거나
            // router.push('/');
            // 또는 로그인 페이지로 보내고 싶으면:
            router.push('/');
        } catch (err: any) {
            setError(err.message ?? '회원가입 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
            <div className="w-full max-w-md p-6 space-y-6">
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">회원가입</h1>
                    <p className="text-sm text-slate-300">
                        이메일과 비밀번호를 입력해서 AI 혈압 코치 계정을 만들어보세요.
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-300">이름 (선택)</label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 홍길동"
                        />
                    </div>

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

                    <div className="space-y-1">
                        <label className="text-sm text-slate-300">비밀번호 확인</label>
                        <input
                            type="password"
                            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
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
                        {loading ? '회원가입 중...' : '회원가입'}
                    </button>
                </form>

                <p className="text-xs text-slate-400">
                    이미 계정이 있으신가요?{' '}
                    <a
                        href="/auth/login"
                        className="text-emerald-400 hover:underline"
                    >
                        로그인 하기
                    </a>
                </p>
            </div>
        </main>
    );
}
