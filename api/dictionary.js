// 표준국어대사전 API 프록시 (검색만 지원)
// Vercel Serverless Function

module.exports = async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { q } = req.query;

    // API 키는 Vercel 환경변수에서 가져옴
    const API_KEY = process.env.KOREAN_DICT_API_KEY;

    if (!API_KEY) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'Vercel에 API 키(KOREAN_DICT_API_KEY)가 설정되지 않았습니다. 대시보드 설정을 확인해주세요.'
            }
        });
    }

    if (!q) {
        return res.status(400).json({
            error: {
                code: 'MISSING_PARAM',
                message: '검색어(q)가 필요합니다.'
            }
        });
    }

    try {
        const params = new URLSearchParams({
            key: API_KEY,
            q: q,
            req_type: 'json',
            num: '10',
            advanced: 'n'
        });
        const apiUrl = `https://stdict.korean.go.kr/api/search.do?${params.toString()}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `국립국어원 API 연결 실패 (상태 코드: ${response.status})`
                }
            });
        }

        const responseText = await response.text();

        // 빈 응답 또는 XML 처리
        if (!responseText || responseText.trim() === '') {
            return res.status(200).json({ channel: { total: 0, item: [] } });
        }

        if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
            return res.status(200).json({
                error: {
                    code: 'XML_RESPONSE',
                    message: '사전 서비스가 일시적으로 점검 중이거나 XML 응답을 반환했습니다.'
                }
            });
        }

        try {
            const data = JSON.parse(responseText);
            res.status(200).json(data);
        } catch (parseError) {
            res.status(200).json({
                error: {
                    code: 'PARSE_ERROR',
                    message: 'API 응답 데이터를 파싱할 수 없습니다.'
                }
            });
        }
    } catch (error) {
        console.error('Dictionary API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '사전 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
}
