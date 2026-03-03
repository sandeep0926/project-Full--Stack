import request from 'supertest';
import { app } from '../src/server.js';

const main = async () => {
    try {
        const res = await request(app).get('/health');
        console.log('GET /health ->', res.status, JSON.stringify(res.body));
    } catch (err) {
        console.error('Error calling /health:', err);
        process.exitCode = 1;
        return;
    }
};

main();

