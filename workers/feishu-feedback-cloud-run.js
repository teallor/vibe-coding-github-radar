'use strict';

// Cloud Run HTTP adapter for the same handler used by the Cloudflare Worker.
global.addEventListener = global.addEventListener || (() => {});

const http = require('http');
const { handleRequest } = require('./feishu-feedback-worker');

function toWebRequest(req, body) {
  const host = req.headers.host || 'localhost';
  const init = { method: req.method, headers: req.headers };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = body;
  return new Request(`https://${host}${req.url}`, init);
}

async function writeWebResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

function createServer(env = process.env) {
  return http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await writeWebResponse(res, await handleRequest(toWebRequest(req, Buffer.concat(chunks)), env));
    } catch (error) {
      console.error(JSON.stringify({ tag: 'request_error', message: error.message }));
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'internal_error' }));
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8080);
  createServer().listen(port, '0.0.0.0', () => console.log(JSON.stringify({ tag: 'listening', port })));
}

module.exports = { createServer, toWebRequest, writeWebResponse };
