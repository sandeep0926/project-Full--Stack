# API Gateway

API Gateway service for the Enterprise Platform. Routes requests to backend services and provides a single entry point for all client requests.

## Features

- Request proxying to monolith backend
- WebSocket support for real-time features
- Health check endpoint
- CORS configuration
- Request logging
- Error handling
- Graceful shutdown

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Start the gateway:
```bash
# Development
npm run dev

# Production
npm start
```

## Endpoints

- `GET /health` - Health check endpoint
- `ALL /api/*` - Proxied to monolith backend
- `WS /socket.io/*` - WebSocket proxy to monolith

## Environment Variables

- `PORT` - Gateway port (default: 4000)
- `MONOLITH_URL` - Backend monolith URL (default: http://localhost:3000)
- `CLIENT_URL` - Client URL for CORS (default: http://localhost:5173)
- `NODE_ENV` - Environment (development/production)

## Docker

Build and run with Docker:

```bash
docker build -t api-gateway .
docker run -p 4000:4000 --env-file .env api-gateway
```

## Health Check

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2024-03-04T10:00:00.000Z",
  "uptime": 123.456,
  "monolithUrl": "http://localhost:3000"
}
```
