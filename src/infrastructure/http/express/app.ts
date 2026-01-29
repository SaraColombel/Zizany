import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health';

export function createApp() {
    const app = express();

    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());
    app.use(cookieParser());

    app.use('/api', healthRouter);

    return app;
}