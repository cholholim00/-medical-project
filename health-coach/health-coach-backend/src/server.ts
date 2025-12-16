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
const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

// 공통 미들웨어
app.use(cors());
app.use(express.json());

// ✅ 헬스 체크
app.get('/health-check', (_req, res) => {
    res.json({ status: 'ok', message: 'health-coach API is running' });
});

// ✅ 이 서버가 맞는지 확인용
app.get('/__test', (req, res) => {
    res.json({
        ok: true,
        msg: 'this is health-coach-backend on port ' + PORT,
        url: req.url,
    });
});

// ✅ 실제 API 라우터들
app.use('/api/auth', authRouter);
app.use('/api/records', recordsRouter);
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);

// (선택) 404 로깅 (맨 마지막)
app.use((req, _res, next) => {
    console.log('⚠️  404 Not Found:', req.method, req.url);
    next();
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
