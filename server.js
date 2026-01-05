// 로컬 개발용 프록시 서버
// npm run dev 로 실행

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// .env 파일 수동 로드
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

const PORT = 3000;
const API_KEY = process.env.KOREAN_DICT_API_KEY;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API 엔드포인트: /api/dictionary (검색만 지원)
    if (pathname === '/api/dictionary') {
        const query = parsedUrl.query.q;

        if (!API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'API 키가 설정되지 않았습니다.' } }));
            return;
        }

        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: '검색어(q)가 필요합니다.' } }));
            return;
        }

        try {
            const apiUrl = `https://stdict.korean.go.kr/api/search.do?key=${API_KEY}&q=${encodeURIComponent(query)}&req_type=json&num=10&advanced=n`;

            const apiResponse = await fetch(apiUrl);
            const data = await apiResponse.json();

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('API Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'API_ERROR', message: error.message } }));
        }
        return;
    }

    // 정적 파일 서빙
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // 보안: 상위 디렉토리 접근 방지
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 로컬 개발 서버 실행 중: http://localhost:${PORT}`);
    console.log(`📖 사전 API: http://localhost:${PORT}/api/dictionary?q=나무`);
    console.log(`🔑 API Key: ${API_KEY ? '설정됨 ✓' : '❌ 설정되지 않음'}\n`);
});
