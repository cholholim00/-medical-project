// src/server.ts
console.log('🌟🌟🌟 BACKEND ENTRY FROM src/server.ts 🌟🌟🌟');

import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import recordsRouter from './routes/records';
import userRouter from './routes/user';
import aiRouter from './routes/ai';

console.log('🚀 health-coach backend STARTED (server.ts 로딩됨)');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// 🔹 0. 이 서버가 맞는지 확인용 라우트
app.get('/__test', (req, res) => {
    res.json({
        ok: true,
        msg: 'this is health-coach-backend on port 5001',
        url: req.url,
    });
});

// 🔹 1. 헬스 체크
app.get('/health-check', (req, res) => {
    res.json({ status: 'ok', message: 'health-coach API is running' });
});

// ✅ 2. 라우터 연결
// 인증
app.use('/api/auth', authRouter);

// 건강 기록 / 사용자 / AI 코치
// -> /api/records 안에서 requireAuth 써서 보호
app.use('/api/records', recordsRouter);
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);

// (선택) 404 로깅 + 응답
app.use((req, res, next) => {
    console.log('⚠️  404 Not Found:', req.method, req.url);
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
