import { Router } from 'express';
import { pool } from '../db/pg';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res, next) => {
    try {
        const result = await pool.query('SELECT 1 as ok');
        res.json({
            status: 'ok',
            db: result.rows,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        next(err);
    }
});