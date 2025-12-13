// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export interface AuthRequest extends Request {
    userId?: number;
}

export function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res
            .status(401)
            .json({ error: '인증 토큰이 필요합니다. 다시 로그인해 주세요.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId?: number };

        if (!payload.userId) {
            return res
                .status(401)
                .json({ error: '유효하지 않은 토큰입니다. 다시 로그인해 주세요.' });
        }

        req.userId = payload.userId;
        next();
    } catch (err) {
        console.error('JWT verify error:', err);
        return res
            .status(401)
            .json({ error: '토큰 검증에 실패했습니다. 다시 로그인해 주세요.' });
    }
}
