# Nginx Load Balancer

Nginx load balancer for the Enterprise Platform. Distributes traffic across multiple API Gateway instances with health checks and failover support.

## Features

- **Load Balancing**: Least connections algorithm
- **Health Checks**: Automatic detection of failed instances
- **Failover**: Automatic routing to healthy instances
- **WebSocket Support**: Full support for Socket.io connections
- **Monitoring**: Dedicated health check endpoints
- **High Availability**: Multiple gateway instances

## Configuration

### Upstream Configuration

```nginx
upstream api_gateway {
    least_conn;
    server gateway-1:4000 max_fails=3 fail_timeout=30s;
    server gateway-2:4001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

- **least_conn**: Routes to instance with fewest active connections
- **max_fails**: Mark instance as down after 3 failures
- **fail_timeout**: Wait 30s before retrying failed instance
- **keepalive**: Maintain 32 persistent connections

### Endpoints

- `GET /nginx-health` - Nginx health check (port 80 and 8080)
- `GET /health` - Gateway health check (proxied)
- `ALL /api/*` - API requests (proxied to gateway)
- `WS /socket.io/*` - WebSocket connections (proxied to gateway)

## Testing

### Test Nginx Health

```bash
curl http://localhost/nginx-health
# Output: healthy
```

### Test Gateway Health (through Nginx)

```bash
curl http://localhost/health
```

### Test API Proxy

```bash
curl http://localhost/api/v1/products
```

### Test Load Balancing

```bash
# Send multiple requests and check gateway logs
for i in {1..10}; do
  curl -s http://localhost/api/v1/products > /dev/null
done
```

## Docker

Build and run:

```bash
docker build -t nginx-lb .
docker run -p 80:80 -p 8080:8080 nginx-lb
```

## Monitoring

Health check endpoint for monitoring tools:

```bash
# Main health check (port 80)
curl http://localhost/nginx-health

# Monitoring health check (port 8080)
curl http://localhost:8080/nginx-health
curl http://localhost:8080/health
```

## Failover Testing

1. Start all services
2. Stop one gateway instance
3. Verify traffic routes to remaining instance
4. Check nginx error logs for failover events

```bash
# Check nginx logs
docker logs nginx-container
```

## Performance

- **Connections**: Supports 1000+ concurrent connections
- **Latency**: < 5ms overhead
- **Throughput**: Limited by backend capacity
- **Failover**: < 30s detection time

## Troubleshooting

### Check Configuration

```bash
nginx -t
```

### View Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Test Upstream

```bash
curl -v http://gateway-1:4000/health
curl -v http://gateway-2:4001/health
```
