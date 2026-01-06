// c:\Users\User\workspace\simple_with\api\place.js
// 네이버 지역검색 API 프록시
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

    const { q, display = '10' } = req.query;

    // 네이버 API 키
    const CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'Vercel에 네이버 API 키가 설정되지 않았습니다.'
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
        const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=${display}&sort=comment`;

        const response = await fetch(apiUrl, {
            headers: {
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Naver Local API Error:', response.status, errorText);
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `네이버 API 연결 실패 (상태 코드: ${response.status})`
                }
            });
        }

        const data = await response.json();

        // HTML 태그 제거 및 데이터 정리
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

        res.status(200).json({
            total: data.total || 0,
            items: items
        });

    } catch (error) {
        console.error('Place API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '장소 검색 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};

