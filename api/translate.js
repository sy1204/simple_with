// c:\Users\User\workspace\simple_with\api\translate.js
// 파파고 번역 API 프록시
// Vercel Serverless Function

module.exports = async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET 또는 POST 지원
    const text = req.method === 'POST' ? req.body?.text : req.query.text;
    const source = (req.method === 'POST' ? req.body?.source : req.query.source) || 'auto';
    const target = (req.method === 'POST' ? req.body?.target : req.query.target) || 'ko';

    // 네이버 API 키
    const CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    // 디버깅: 환경변수 확인
    console.log('[Translate] NAVER_CLIENT_ID exists:', !!CLIENT_ID);
    console.log('[Translate] NAVER_CLIENT_SECRET exists:', !!CLIENT_SECRET);

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'Vercel에 네이버 API 키가 설정되지 않았습니다. (ID: ' + (CLIENT_ID ? '있음' : '없음') + ', Secret: ' + (CLIENT_SECRET ? '있음' : '없음') + ')'
            }
        });
    }

    if (!text) {
        return res.status(400).json({
            error: {
                code: 'MISSING_PARAM',
                message: '번역할 텍스트(text)가 필요합니다.'
            }
        });
    }

    try {
        // 1. 언어 감지 (source가 'auto'인 경우)
        let detectedSource = source;
        if (source === 'auto') {
            const detectResponse = await fetch('https://openapi.naver.com/v1/papago/detectLangs', {
                method: 'POST',
                headers: {
                    'X-Naver-Client-Id': CLIENT_ID,
                    'X-Naver-Client-Secret': CLIENT_SECRET,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `query=${encodeURIComponent(text)}`
            });

            if (detectResponse.ok) {
                const detectData = await detectResponse.json();
                detectedSource = detectData.langCode || 'en';
            } else {
                detectedSource = 'en'; // 감지 실패 시 기본값
            }
        }

        // 2. 타겟 언어 자동 설정 (한국어면 영어로, 그 외면 한국어로)
        let finalTarget = target;
        if (target === 'auto') {
            finalTarget = detectedSource === 'ko' ? 'en' : 'ko';
        }

        // 3. 번역 API 호출
        const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
            method: 'POST',
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `source=${detectedSource}&target=${finalTarget}&text=${encodeURIComponent(text)}`
        });

        if (!translateResponse.ok) {
            const errorText = await translateResponse.text();
            console.error('Papago API Error:', translateResponse.status, errorText);
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `파파고 API 연결 실패 (상태 코드: ${translateResponse.status})`
                }
            });
        }

        const data = await translateResponse.json();

        // 응답 형식 통일
        const result = {
            source: detectedSource,
            target: finalTarget,
            text: text,
            translatedText: data.message?.result?.translatedText || ''
        };

        res.status(200).json(result);

    } catch (error) {
        console.error('Translate API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '번역 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};

