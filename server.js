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
const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;

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

    // ===== API 엔드포인트: /api/weather (기상청 API허브) =====
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
            let year = now.getFullYear();
            let month = now.getMonth() + 1;
            let day = now.getDate();
            let hour = now.getHours();
            const minutes = now.getMinutes();

            let baseDate, baseTime, endpoint;

            if (type === 'ultra') {
                // 초단기실황: 매시 정각 발표, 40분 후부터 사용 가능
                if (minutes < 40) {
                    hour = hour - 1;
                    if (hour < 0) {
                        hour = 23;
                        day = day - 1;
                        if (day < 1) {
                            month = month - 1;
                            if (month < 1) { month = 12; year = year - 1; }
                            day = new Date(year, month, 0).getDate();
                        }
                    }
                }
                baseDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
                baseTime = String(hour).padStart(2, '0') + '00';
                endpoint = 'getUltraSrtNcst';
            } else {
                // 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표 (발표 후 약 10분)
                const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
                let baseHour = 23;
                
                for (let i = baseHours.length - 1; i >= 0; i--) {
                    if (hour > baseHours[i] || (hour === baseHours[i] && minutes >= 10)) {
                        baseHour = baseHours[i];
                        break;
                    }
                    if (i === 0) {
                        baseHour = 23;
                        day = day - 1;
                        if (day < 1) {
                            month = month - 1;
                            if (month < 1) { month = 12; year = year - 1; }
                            day = new Date(year, month, 0).getDate();
                        }
                    }
                }
                
                baseDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
                baseTime = String(baseHour).padStart(2, '0') + '00';
                endpoint = 'getVilageFcst';
            }

            // 기상청 API허브 URL 형식
            const numOfRows = type === 'ultra' ? 100 : 1000;
            const apiUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/${endpoint}?pageNo=1&numOfRows=${numOfRows}&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}&authKey=${KMA_API_KEY}`;
            
            console.log(`[Weather] Fetching ${type}: ${baseDate} ${baseTime} (${nx}, ${ny})`);

            const apiResponse = await fetch(apiUrl);
            const responseText = await apiResponse.text();

            console.log(`[Weather] Response status: ${apiResponse.status}`);

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

    // ===== API 엔드포인트: /api/midforecast (기상청 중기예보) =====
    if (pathname === '/api/midforecast') {
        const regId = parsedUrl.query.regId || '11B00000';  // 서울/경기 기본값
        const stnId = parsedUrl.query.stnId || '108';       // 서울 기본값

        if (!KMA_API_KEY) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: '기상청 API 키가 설정되지 않았습니다.' } }));
            return;
        }

        try {
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth() + 1;
            let day = now.getDate();
            const hour = now.getHours();

            // 중기예보: 06시, 18시 발표
            let baseTime;
            if (hour < 6) {
                day = day - 1;
                if (day < 1) {
                    month = month - 1;
                    if (month < 1) { month = 12; year = year - 1; }
                    day = new Date(year, month, 0).getDate();
                }
                baseTime = '1800';
            } else if (hour < 18) {
                baseTime = '0600';
            } else {
                baseTime = '1800';
            }

            const tmFc = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${baseTime}`;
            console.log(`[MidForecast] tmFc: ${tmFc}, regId: ${regId}, stnId: ${stnId}`);

            const [tempRes, landRes] = await Promise.all([
                fetch(`https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidTa?stnId=${stnId}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`),
                fetch(`https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidLandFcst?regId=${regId}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`)
            ]);

            const tempText = await tempRes.text();
            const landText = await landRes.text();

            let tempData, landData;
            try {
                tempData = JSON.parse(tempText);
                landData = JSON.parse(landText);
            } catch (e) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: 'PARSE_ERROR', message: '중기예보 API 응답 파싱 오류' } }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ temperature: tempData, land: landData, tmFc: tmFc }));
        } catch (error) {
            console.error('[MidForecast] Error:', error);
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

    // 실시간 환율 API
    if (pathname === '/api/exchange') {
        try {
            const apiResponse = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,KRW,JPY,CNY,GBP');
            
            if (!apiResponse.ok) {
                throw new Error(`API 응답 오류: ${apiResponse.status}`);
            }

            const data = await apiResponse.json();
            
            const rates = {
                USD: 1,
                EUR: data.rates.EUR || 0.92,
                KRW: data.rates.KRW || 1350,
                JPY: data.rates.JPY || 157,
                CNY: data.rates.CNY || 7.2,
                GBP: data.rates.GBP || 0.79
            };

            console.log(`[Exchange] Rates loaded: ${data.date}`);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, date: data.date, base: 'USD', rates }));
        } catch (error) {
            console.error('[Exchange] Error:', error);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                success: false,
                date: new Date().toISOString().split('T')[0],
                base: 'USD',
                rates: { USD: 1, EUR: 0.92, KRW: 1350, JPY: 157, CNY: 7.2, GBP: 0.79 },
                error: error.message
            }));
        }
        return;
    }

    // ===== 미세먼지 API (에어코리아) =====
    if (pathname === '/api/airquality') {
        if (!DATA_GO_KR_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'NO_API_KEY', message: 'DATA_GO_KR_API_KEY가 설정되지 않았습니다.' } }));
            return;
        }

        const { stationName, sidoName } = parsedUrl.query;
        
        let apiUrl;
        if (stationName) {
            apiUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${DATA_GO_KR_API_KEY}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.0`;
        } else if (sidoName) {
            apiUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${DATA_GO_KR_API_KEY}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(sidoName)}&ver=1.0`;
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'stationName 또는 sidoName 필요' } }));
            return;
        }

        try {
            console.log(`[AirQuality] Fetching: ${apiUrl.replace(DATA_GO_KR_API_KEY, 'HIDDEN')}`);
            const apiResponse = await fetch(apiUrl);
            const data = await apiResponse.json();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('[AirQuality] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== 생활기상지수 API =====
    if (pathname === '/api/livingindex') {
        if (!DATA_GO_KR_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'NO_API_KEY', message: 'DATA_GO_KR_API_KEY가 설정되지 않았습니다.' } }));
            return;
        }

        const { type, areaNo, time } = parsedUrl.query;
        
        if (!type || !areaNo || !time) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'type, areaNo, time 파라미터 필요' } }));
            return;
        }

        const endpoints = {
            UV: 'getUVIdxV4', fsn: 'getFsnIdxV4', sensorytem: 'getSenTaIdxV4',
            airDiffusion: 'getAirDiffusionIdxV4'
        };
        const endpoint = endpoints[type];
        
        if (!endpoint) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'INVALID_TYPE', message: `유효하지 않은 type: ${type}` } }));
            return;
        }

        const apiUrl = `http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/${endpoint}?serviceKey=${DATA_GO_KR_API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&areaNo=${areaNo}&time=${time}`;

        try {
            console.log(`[LivingIndex] Fetching: ${apiUrl.replace(DATA_GO_KR_API_KEY, 'HIDDEN')}`);
            const apiResponse = await fetch(apiUrl);
            const data = await apiResponse.json();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error('[LivingIndex] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: error.message } }));
        }
        return;
    }

    // ===== 일출/일몰 API =====
    if (pathname === '/api/sunriseset') {
        if (!DATA_GO_KR_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'NO_API_KEY', message: 'DATA_GO_KR_API_KEY가 설정되지 않았습니다.' } }));
            return;
        }

        const { locdate, location } = parsedUrl.query;
        
        if (!locdate) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'MISSING_PARAM', message: 'locdate 파라미터 필요 (YYYYMMDD)' } }));
            return;
        }

        let apiUrl = `http://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getLCRiseSetInfo?serviceKey=${DATA_GO_KR_API_KEY}&locdate=${locdate}`;
        apiUrl += `&location=${encodeURIComponent(location || '서울')}`;

        try {
            console.log(`[SunRiseSet] Fetching: ${apiUrl.replace(DATA_GO_KR_API_KEY, 'HIDDEN')}`);
            const apiResponse = await fetch(apiUrl);
            const text = await apiResponse.text();
            console.log(`[SunRiseSet] Response:`, text.substring(0, 500));
            
            // XML 파싱
            const parseXml = (xml, tag) => {
                const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
                return match ? match[1].trim() : null;
            };
            
            // 에러 체크
            const resultCode = parseXml(text, 'resultCode');
            if (resultCode && resultCode !== '00') {
                const resultMsg = parseXml(text, 'resultMsg');
                console.error('[SunRiseSet] API Error:', resultCode, resultMsg);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: { code: resultCode, message: resultMsg } }));
                return;
            }
            
            const data = {
                location: parseXml(text, 'location') || location || '서울',
                locdate: parseXml(text, 'locdate') || locdate,
                sunrise: parseXml(text, 'sunrise'),
                sunset: parseXml(text, 'sunset'),
                moonrise: parseXml(text, 'moonrise'),
                moonset: parseXml(text, 'moonset')
            };
            
            console.log('[SunRiseSet] Parsed data:', data);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ response: { body: { items: { item: data } } } }));
        } catch (error) {
            console.error('[SunRiseSet] Error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: error.message } }));
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
    console.log(`   - 미세먼지: /api/airquality?sidoName=서울`);
    console.log(`   - 생활지수: /api/livingindex?type=UV&areaNo=1100000000&time=2024010106`);
    console.log(`   - 일출일몰: /api/sunriseset?locdate=20240101&location=서울`);
    console.log(`\n🔑 API 키 상태:`);
    console.log(`   - 국어사전: ${KOREAN_DICT_API_KEY ? '✓ 설정됨' : '❌ 미설정'}`);
    console.log(`   - 네이버: ${NAVER_CLIENT_ID ? '✓ 설정됨' : '❌ 미설정'}`);
    console.log(`   - 기상청: ${KMA_API_KEY ? '✓ 설정됨' : '❌ 미설정'}`);
    console.log(`   - 공공데이터: ${DATA_GO_KR_API_KEY ? '✓ 설정됨' : '❌ 미설정'}\n`);
});
