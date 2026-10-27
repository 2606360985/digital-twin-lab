import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('./dist/', import.meta.url))
const port = Number(process.env.PORT || 5173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
try { await stat(path.join(root, 'index.html')) } catch { console.error('未找到构建产物。请先执行 npm run build。'); process.exit(1) }
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname)
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!target.startsWith(root)) { res.writeHead(403); res.end(); return }
    const bytes = await readFile(target)
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : bytes)
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('资源不存在。请从首页进入实验。') }
})
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? `端口${port}已使用。若原型已启动，请直接打开 http://127.0.0.1:${port}/` : err.message); process.exit(1) })
server.listen(port, '127.0.0.1', () => console.log(`数字孪生实验原型已启动： http://127.0.0.1:${port}/\n仅本机可访问。保持此窗口开启；按 Ctrl+C 停止。`))
