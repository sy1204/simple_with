// 한국천문연구원 출몰시각 정보 API 프록시
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
        console.error('[SunRiseSet] DATA_GO_KR_API_KEY not found');
        return res.status(500).json({ error: { code: 'NO_API_KEY', message: 'API 키가 설정되지 않았습니다.' } });
    }

    try {
        const { locdate, location } = req.query;
        
        // locdate: YYYYMMDD 형식
        // location: 지역명 (서울, 부산, 인천 등)
        
        if (!locdate) {
            return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'locdate 파라미터가 필요합니다. (형식: YYYYMMDD)' } });
        }

        // location 없이 locdate만 있으면 기본 위치(서울) 사용
        let apiUrl = `http://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getLCRiseSetInfo?serviceKey=${API_KEY}&locdate=${locdate}`;
        
        if (location) {
            apiUrl += `&location=${encodeURIComponent(location)}`;
        } else {
            apiUrl += `&location=${encodeURIComponent('서울')}`;
        }

        console.log('[SunRiseSet] Fetching:', apiUrl.replace(API_KEY, 'API_KEY_HIDDEN'));

        const response = await fetch(apiUrl);
        const text = await response.text();

        console.log('[SunRiseSet] Response status:', response.status);
        console.log('[SunRiseSet] Response preview:', text.substring(0, 500));

        // XML 응답을 JSON으로 변환 (이 API는 XML 반환)
        // 간단한 XML 파싱
        const parseXmlValue = (xml, tag) => {
            const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
            const match = xml.match(regex);
            return match ? match[1].trim() : null;
        };

        const resultCode = parseXmlValue(text, 'resultCode');
        
        // resultCode가 없거나 00이 아닌 경우 에러
        if (resultCode && resultCode !== '00') {
            const resultMsg = parseXmlValue(text, 'resultMsg');
            console.error('[SunRiseSet] API Error:', resultCode, resultMsg);
            return res.status(200).json({ error: { code: resultCode, message: resultMsg } });
        }

        // 필요한 데이터 추출
        const data = {
            location: parseXmlValue(text, 'location') || location || '서울',
            locdate: parseXmlValue(text, 'locdate') || locdate,
            sunrise: parseXmlValue(text, 'sunrise'),      // 일출
            sunset: parseXmlValue(text, 'sunset'),        // 일몰
            moonrise: parseXmlValue(text, 'moonrise'),    // 월출
            moonset: parseXmlValue(text, 'moonset'),      // 월몰
            civilm: parseXmlValue(text, 'civilm'),        // 시민박명(아침)
            civile: parseXmlValue(text, 'civile'),        // 시민박명(저녁)
            nautm: parseXmlValue(text, 'nautm'),          // 항해박명(아침)
            naute: parseXmlValue(text, 'naute'),          // 항해박명(저녁)
            astm: parseXmlValue(text, 'astm'),            // 천문박명(아침)
            aste: parseXmlValue(text, 'aste')             // 천문박명(저녁)
        };
        
        console.log('[SunRiseSet] Parsed data:', data);

        res.status(200).json({ response: { body: { items: { item: data } } } });

    } catch (error) {
        console.error('[SunRiseSet] Error:', error);
        res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
    }
};

