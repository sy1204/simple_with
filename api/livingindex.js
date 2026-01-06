// 기상청 생활기상지수 조회서비스(3.0) API 프록시
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
        console.error('[LivingIndex] DATA_GO_KR_API_KEY not found');
        return res.status(500).json({ error: { code: 'NO_API_KEY', message: 'API 키가 설정되지 않았습니다.' } });
    }

    try {
        const { type, areaNo, time } = req.query;
        
        // type: 자외선(UV), 식중독(fsn), 체감온도(sensorytem), 동파(frostbite), 열(heat), 불쾌(discomfort)
        // areaNo: 지역코드 (서울: 1100000000, 부산: 2600000000 등)
        // time: YYYYMMDDHH 형식
        
        if (!type || !areaNo || !time) {
            return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'type, areaNo, time 파라미터가 필요합니다.' } });
        }

        // 지수 종류별 엔드포인트 (V4 버전)
        const endpoints = {
            UV: 'getUVIdxV4',              // 자외선지수
            fsn: 'getFsnIdxV4',            // 식중독지수
            sensorytem: 'getSenTaIdxV4',   // 체감온도 (여름철)
            airDiffusion: 'getAirDiffusionIdxV4' // 대기확산지수
        };

        const endpoint = endpoints[type];
        if (!endpoint) {
            return res.status(400).json({ error: { code: 'INVALID_TYPE', message: `유효하지 않은 type: ${type}. 가능한 값: ${Object.keys(endpoints).join(', ')}` } });
        }

        const apiUrl = `http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/${endpoint}?serviceKey=${API_KEY}&numOfRows=10&pageNo=1&dataType=JSON&areaNo=${areaNo}&time=${time}`;

        console.log('[LivingIndex] Fetching:', apiUrl.replace(API_KEY, 'API_KEY_HIDDEN'));

        const response = await fetch(apiUrl);
        const text = await response.text();

        console.log('[LivingIndex] Response status:', response.status);
        console.log('[LivingIndex] Response preview:', text.substring(0, 300));

        // JSON 파싱 시도
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[LivingIndex] JSON parse error:', e.message);
            return res.status(500).json({ error: { code: 'PARSE_ERROR', message: '응답 파싱 실패', raw: text.substring(0, 500) } });
        }

        // 에러 응답 체크
        if (data.response?.header?.resultCode !== '00') {
            const code = data.response?.header?.resultCode;
            const msg = data.response?.header?.resultMsg;
            console.error('[LivingIndex] API Error:', code, msg);
            return res.status(200).json({ error: { code, message: msg } });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('[LivingIndex] Error:', error);
        res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
    }
};

