import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import superjson from 'superjson';
import { config } from './config.js';
import { catalogQuerySchema, getCatalog } from './catalog.js';

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': config.CLIENT_ORIGIN,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(superjson.serialize(payload)));
}

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': config.CLIENT_ORIGIN,
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'pafhub-api' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/catalog') {
    const parsed = catalogQuerySchema.safeParse({
      search: url.searchParams.get('search') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      sendJson(response, 400, { error: 'Invalid catalog query', details: parsed.error.flatten() });
      return;
    }
    sendJson(response, 200, { data: getCatalog(parsed.data) });
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

const server = createServer(handleRequest);
server.listen(config.PORT, () => {
  console.log(`PAFHub API listening on http://localhost:${config.PORT}`);
});
