// 표준국어대사전 API 프록시 (검색만 지원)
// Vercel Serverless Function

export default async function handler(req, res) {
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
        res.status(500).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'API 키가 설정되지 않았습니다.'
            }
        });
        return;
    }

    if (!q) {
        res.status(400).json({
            error: {
                code: 'MISSING_PARAM',
                message: '검색어(q)가 필요합니다.'
            }
        });
        return;
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
            throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        res.status(200).json(data);
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
