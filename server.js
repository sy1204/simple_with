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

// API 키들
const KOREAN_DICT_API_KEY = process.env.KOREAN_DICT_API_KEY;
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const KMA_API_KEY = process.env.KMA_API_KEY;

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ===== API 엔드포인트: /api/dictionary (국어사전) =====
    if (pathname === '/api/dictionary') {
        const query = parsedUrl.query.q;

        if (!KOREAN_DICT_API_KEY) {
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
            const apiUrl = `https://stdict.korean.go.kr/api/search.do?key=${KOREAN_DICT_API_KEY}&q=${encodeURIComponent(query)}&req_type=json&num=10&advanced=n`;
            console.log(`[Dictionary] Fetching: ${apiUrl.replace(KOREAN_DICT_API_KEY, 'HIDDEN')}`);

            const apiResponse = await fetch(apiUrl);

            if (!apiResponse.ok) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'API_FETCH_FAILED', message: `국립국어원 API 연결 실패 (${apiResponse.status})` } }));
                return;
            }

            const responseText = await apiResponse.text();
            if (!responseText || responseText.trim() === '') {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ channel: { total: 0, item: [] } }));
                return;
            }

            if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'XML_RESPONSE', message: '사전 서비스가 점검 중입니다.' } }));
                return;
            }

            const data = JSON.parse(responseText);
            console.log(`[Dictionary] Found ${data.channel?.total || 0} items`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('[Dictionary] Error:', error);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== API 엔드포인트: /api/english (영어사전) =====
    if (pathname === '/api/english') {
        const query = parsedUrl.query.q;

        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: '검색어(q)가 필요합니다.' } }));
            return;
        }

        try {
            // 1. Free Dictionary API
            const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
            let dictData = null;
            let koreanMeaning = '';

            if (dictResponse.ok) {
                dictData = await dictResponse.json();
            }

            // 2. 파파고 번역 (네이버 API 키가 있는 경우)
            if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
                try {
                    const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
                        method: 'POST',
                        headers: {
                            'X-Naver-Client-Id': NAVER_CLIENT_ID,
                            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: `source=en&target=ko&text=${encodeURIComponent(query)}`
                    });
                    if (translateResponse.ok) {
                        const translateData = await translateResponse.json();
                        koreanMeaning = translateData.message?.result?.translatedText || '';
                    }
                } catch (e) { console.error('[English] Papago error:', e); }
            }

            // 3. 응답 구성
            if (!dictData || dictData.title === 'No Definitions Found') {
                if (koreanMeaning) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ word: query, koreanMeaning, phonetic: '', audio: '', meanings: [], source: 'papago' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `'${query}'에 대한 결과가 없습니다.` } }));
                }
                return;
            }

            const entry = dictData[0];
            let phonetic = entry.phonetic || '';
            let audioUrl = '';
            if (entry.phonetics) {
                for (const p of entry.phonetics) {
                    if (p.text && !phonetic) phonetic = p.text;
                    if (p.audio && !audioUrl) audioUrl = p.audio;
                }
            }

            const meanings = (entry.meanings || []).map(m => ({
                partOfSpeech: m.partOfSpeech || '',
                definitions: (m.definitions || []).slice(0, 3).map(d => ({
                    definition: d.definition || '',
                    example: d.example || '',
                    synonyms: (d.synonyms || []).slice(0, 5)
                }))
            }));

            console.log(`[English] Found: ${entry.word}`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ word: entry.word || query, koreanMeaning, phonetic, audio: audioUrl, meanings, source: 'freedictionary' }));
        } catch (error) {
            console.error('[English] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { code: 'API_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== API 엔드포인트: /api/translate (파파고 번역) =====
    if (pathname === '/api/translate') {
        const text = parsedUrl.query.text;
        const source = parsedUrl.query.source || 'auto';
        const target = parsedUrl.query.target || 'ko';

        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: '네이버 API 키가 설정되지 않았습니다.' } }));
            return;
        }

        if (!text) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: '번역할 텍스트(text)가 필요합니다.' } }));
            return;
        }

        try {
            // 언어 감지
            let detectedSource = source;
            if (source === 'auto') {
                const detectResponse = await fetch('https://openapi.naver.com/v1/papago/detectLangs', {
                    method: 'POST',
                    headers: {
                        'X-Naver-Client-Id': NAVER_CLIENT_ID,
                        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `query=${encodeURIComponent(text)}`
                });
                if (detectResponse.ok) {
                    const detectData = await detectResponse.json();
                    detectedSource = detectData.langCode || 'en';
                }
            }

            let finalTarget = target === 'auto' ? (detectedSource === 'ko' ? 'en' : 'ko') : target;

            // 번역
            const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
                method: 'POST',
                headers: {
                    'X-Naver-Client-Id': NAVER_CLIENT_ID,
                    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `source=${detectedSource}&target=${finalTarget}&text=${encodeURIComponent(text)}`
            });

            if (!translateResponse.ok) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'API_FETCH_FAILED', message: `파파고 API 실패 (${translateResponse.status})` } }));
                return;
            }

            const data = await translateResponse.json();
            console.log(`[Translate] ${detectedSource} → ${finalTarget}`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                source: detectedSource,
                target: finalTarget,
                text: text,
                translatedText: data.message?.result?.translatedText || ''
            }));
        } catch (error) {
            console.error('[Translate] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { code: 'API_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== API 엔드포인트: /api/weather (기상청) =====
    if (pathname === '/api/weather') {
        const nx = parsedUrl.query.nx || '60';  // 서울 기본값
        const ny = parsedUrl.query.ny || '127';
        const type = parsedUrl.query.type || 'ultra';  // ultra: 초단기실황, short: 단기예보

        if (!KMA_API_KEY) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: '기상청 API 키가 설정되지 않았습니다.' } }));
            return;
        }

        try {
            const now = new Date();
            const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
            
            // 초단기실황: 매시 정각 발표, 10분 후부터 사용 가능
            let baseTime;
            if (type === 'ultra') {
                const hour = now.getHours();
                baseTime = String(hour).padStart(2, '0') + '00';
            } else {
                // 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표
                const hours = [2, 5, 8, 11, 14, 17, 20, 23];
                const currentHour = now.getHours();
                let baseHour = hours.filter(h => h <= currentHour).pop() || 23;
                baseTime = String(baseHour).padStart(2, '0') + '00';
            }

            const endpoint = type === 'ultra' 
                ? 'getUltraSrtNcst'  // 초단기실황
                : 'getVilageFcst';   // 단기예보

            // 공공데이터포털 API 키는 이미 인코딩되어 있으므로 그대로 사용
            const apiUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/${endpoint}?serviceKey=${KMA_API_KEY}&numOfRows=100&pageNo=1&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
            
            console.log(`[Weather] Fetching ${type}: ${baseDate} ${baseTime} (${nx}, ${ny})`);

            const apiResponse = await fetch(apiUrl);
            const responseText = await apiResponse.text();

            if (!apiResponse.ok) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'API_FETCH_FAILED', message: `기상청 API 실패 (${apiResponse.status})` } }));
                return;
            }

            const data = JSON.parse(responseText);
            
            if (data.response?.header?.resultCode !== '00') {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'API_ERROR', message: data.response?.header?.resultMsg || '기상청 API 오류' } }));
                return;
            }

            console.log(`[Weather] Success`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('[Weather] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { code: 'API_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== API 엔드포인트: /api/place (네이버 지역검색) =====
    if (pathname === '/api/place') {
        const query = parsedUrl.query.q;
        const display = parsedUrl.query.display || '10';

        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: '네이버 API 키가 설정되지 않았습니다.' } }));
            return;
        }

        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: '검색어(q)가 필요합니다.' } }));
            return;
        }

        try {
            const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`;

            const apiResponse = await fetch(apiUrl, {
                headers: {
                    'X-Naver-Client-Id': NAVER_CLIENT_ID,
                    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
                }
            });

            if (!apiResponse.ok) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'API_FETCH_FAILED', message: `네이버 API 실패 (${apiResponse.status})` } }));
                return;
            }

            const data = await apiResponse.json();
            
            // HTML 태그 제거 및 정리
            const items = (data.items || []).map(item => ({
                title: (item.title || '').replace(/<\/?b>/g, ''),
                category: item.category || '',
                address: item.address || '',
                roadAddress: item.roadAddress || '',
                telephone: item.telephone || '',
                link: item.link || '',
                mapx: item.mapx || '',
                mapy: item.mapy || ''
            }));

            console.log(`[Place] Found ${items.length} places for "${query}"`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ total: data.total || 0, items }));
        } catch (error) {
            console.error('[Place] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
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
    console.log(`\n📖 API 엔드포인트:`);
    console.log(`   - 국어사전: /api/dictionary?q=나무`);
    console.log(`   - 영어사전: /api/english?q=hello`);
    console.log(`   - 번역: /api/translate?text=hello&source=en&target=ko`);
    console.log(`   - 날씨: /api/weather?nx=60&ny=127&type=ultra`);
    console.log(`   - 장소검색: /api/place?q=강남역 맛집`);
    console.log(`\n🔑 API 키 상태:`);
    console.log(`   - 국어사전: ${KOREAN_DICT_API_KEY ? '✓ 설정됨' : '❌ 미설정'}`);
    console.log(`   - 네이버: ${NAVER_CLIENT_ID ? '✓ 설정됨' : '❌ 미설정'}`);
    console.log(`   - 기상청: ${KMA_API_KEY ? '✓ 설정됨' : '❌ 미설정'}\n`);
});
