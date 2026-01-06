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

    console.log('[Translate] CLIENT_ID exists:', !!CLIENT_ID);
    console.log('[Translate] CLIENT_SECRET exists:', !!CLIENT_SECRET);

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'Vercel에 네이버 API 키가 설정되지 않았습니다.'
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
            try {
                const detectResponse = await fetch('https://openapi.naver.com/v1/papago/detectLangs', {
                    method: 'POST',
                    headers: {
                        'X-Naver-Client-Id': CLIENT_ID,
                        'X-Naver-Client-Secret': CLIENT_SECRET,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `query=${encodeURIComponent(text)}`
                });

                console.log('[Translate] Detect response status:', detectResponse.status);

                if (detectResponse.ok) {
                    const detectData = await detectResponse.json();
                    detectedSource = detectData.langCode || 'en';
                    console.log('[Translate] Detected language:', detectedSource);
                } else {
                    // 언어 감지 실패 시 기본값
                    const isKorean = /[가-힣]/.test(text);
                    detectedSource = isKorean ? 'ko' : 'en';
                    console.log('[Translate] Detection failed, guessing:', detectedSource);
                }
            } catch (e) {
                // 언어 감지 실패 시 기본값
                const isKorean = /[가-힣]/.test(text);
                detectedSource = isKorean ? 'ko' : 'en';
                console.log('[Translate] Detection error, guessing:', detectedSource);
            }
        }

        // 2. 타겟 언어 자동 설정
        let finalTarget = target;
        if (target === 'auto') {
            finalTarget = detectedSource === 'ko' ? 'en' : 'ko';
        }

        // 3. 번역 API 호출
        console.log(`[Translate] Translating from ${detectedSource} to ${finalTarget}`);
        
        const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
            method: 'POST',
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `source=${detectedSource}&target=${finalTarget}&text=${encodeURIComponent(text)}`
        });

        console.log('[Translate] Translate response status:', translateResponse.status);

        if (!translateResponse.ok) {
            const errorText = await translateResponse.text();
            console.error('[Translate] API Error:', errorText);
            
            // 404인 경우 API 미등록 안내
            if (translateResponse.status === 404) {
                return res.status(200).json({
                    error: {
                        code: 'API_NOT_FOUND',
                        message: '파파고 API가 네이버 개발자센터에서 활성화되지 않았습니다. 애플리케이션 설정에서 "Papago 번역"을 추가해주세요.'
                    }
                });
            }
            
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `파파고 API 연결 실패 (상태 코드: ${translateResponse.status})`
                }
            });
        }

        const data = await translateResponse.json();

        res.status(200).json({
            source: detectedSource,
            target: finalTarget,
            text: text,
            translatedText: data.message?.result?.translatedText || ''
        });

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
