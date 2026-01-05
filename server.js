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
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const index = trimmed.indexOf('=');
            if (index > -1) {
                const key = trimmed.substring(0, index).trim();
                let value = trimmed.substring(index + 1).trim();
                // 따옴표 제거
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[key] = value;
            }
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

    console.log(`[Server] ${req.method} ${pathname}`);

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
            console.log(`[Proxy] Fetching: ${apiUrl.replace(API_KEY, 'HIDDEN_KEY')}`);

            const apiResponse = await fetch(apiUrl);

            if (!apiResponse.ok) {
                console.error(`[Proxy] API Fetch Failed: ${apiResponse.status}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { code: 'FETCH_ERROR', message: `API 서버 응답 오류 (${apiResponse.status})` } }));
                return;
            }

            const responseText = await apiResponse.text();

            // 빈 응답 처리
            if (!responseText || responseText.trim() === '') {
                console.log('[Proxy] API returned empty response');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ channel: { total: 0, item: [] } }));
                return;
            }

            // XML 응답 체크
            if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
                console.error('[Proxy] API returned XML instead of JSON');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    error: {
                        code: 'XML_RESPONSE',
                        message: 'API가 일시적으로 XML 형식을 반환했습니다.'
                    }
                }));
                return;
            }

            try {
                const data = JSON.parse(responseText);
                console.log(`[Proxy] Success: Found ${data.channel?.total || 0} items`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(data));
            } catch (parseError) {
                console.error('[Proxy] JSON Parse Error:', parseError.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { code: 'PARSE_ERROR', message: 'API 응답 데이터를 읽을 수 없습니다.' } }));
            }
        } catch (error) {
            console.error('[Proxy] Global Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'API_ERROR', message: error.message } }));
        }
        return;
    }

    // 정적 파일 서빙
    let filePath = pathname === '/' ? '/index.html' : pathname;

    // public 폴더 확인 우선
    let fullPath = path.join(__dirname, 'public', filePath);
    if (!fs.existsSync(fullPath)) {
        fullPath = path.join(__dirname, filePath);
    }
    filePath = fullPath;

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
    console.log(`🔑 API Key: ${API_KEY ? `설정됨 (${API_KEY.substring(0, 5)}...) ✓` : '❌ 설정되지 않음'}\n`);
});
