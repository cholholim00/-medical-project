// src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export interface JwtPayload {
    id: number;
    email: string;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.slice(7); // 'Bearer ' 이후

    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = payload; // 🔹 여기서 req.user.id, req.user.email 사용 가능
        next();
    } catch (err) {
        console.error('JWT verify error', err);
        return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
}
