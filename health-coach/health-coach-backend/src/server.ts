// src/server.ts
import express from 'express';
import cors from 'cors';
import recordsRouter from './routes/recods';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// 헬스 체크
app.get('/health-check', (req, res) => {
    res.json({ status: 'ok', message: 'health-coach API is running' });
});

// ✅ 기록 관련 API 등록
app.use('/api/records', recordsRouter);

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
