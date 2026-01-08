// 한국환경공단 에어코리아 대기오염정보 API 프록시
// Vercel Serverless Function

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const API_KEY = process.env.DATA_GO_KR_API_KEY;
    
    if (!API_KEY) {
        console.error('[AirQuality] DATA_GO_KR_API_KEY not found');
        return res.status(500).json({ error: { code: 'NO_API_KEY', message: 'API 키가 설정되지 않았습니다.' } });
    }

    try {
        const { stationName, sidoName } = req.query;
        
        let apiUrl;
        
        if (stationName) {
            // 측정소별 실시간 측정정보
            apiUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${API_KEY}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.0`;
        } else if (sidoName) {
            // 시도별 실시간 측정정보
            apiUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${API_KEY}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(sidoName)}&ver=1.0`;
        } else {
            return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'stationName 또는 sidoName 파라미터가 필요합니다.' } });
        }

        console.log('[AirQuality] Fetching:', apiUrl.replace(API_KEY, 'API_KEY_HIDDEN'));

        const response = await fetch(apiUrl);
        const text = await response.text();

        console.log('[AirQuality] Response status:', response.status);
        console.log('[AirQuality] Response preview:', text.substring(0, 300));

        // JSON 파싱 시도
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[AirQuality] JSON parse error:', e.message);
            return res.status(500).json({ error: { code: 'PARSE_ERROR', message: '응답 파싱 실패', raw: text.substring(0, 500) } });
        }

        // 에러 응답 체크
        if (data.response?.header?.resultCode !== '00') {
            const code = data.response?.header?.resultCode;
            const msg = data.response?.header?.resultMsg;
            console.error('[AirQuality] API Error:', code, msg);
            return res.status(200).json({ error: { code, message: msg } });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('[AirQuality] Error:', error);
        res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
    }
};





