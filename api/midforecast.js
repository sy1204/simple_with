// c:\Users\User\workspace\simple_with\api\midforecast.js
// 기상청 중기예보 API 프록시
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

    const { regId = '11B00000', stnId = '108' } = req.query;
    // regId: 예보구역코드 (기본: 서울/경기)
    // stnId: 지점번호 (기본: 서울)

    const KMA_API_KEY = process.env.KMA_API_KEY;

    if (!KMA_API_KEY) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: 'Vercel에 기상청 API 키(KMA_API_KEY)가 설정되지 않았습니다.'
            }
        });
    }

    try {
        const now = new Date();
        // 한국 시간으로 변환 (UTC+9)
        const kstOffset = 9 * 60 * 60 * 1000;
        const koreaTime = new Date(now.getTime() + kstOffset);
        
        let year = koreaTime.getUTCFullYear();
        let month = koreaTime.getUTCMonth() + 1;
        let day = koreaTime.getUTCDate();
        let hour = koreaTime.getUTCHours();

        // 중기예보: 06시, 18시 발표
        // 06시 이전이면 전날 18시, 06~18시면 당일 06시, 18시 이후면 당일 18시
        let baseTime;
        if (hour < 6) {
            // 전날 18시
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

        // 중기기온조회 + 중기육상예보조회 동시 요청
        const [tempRes, landRes] = await Promise.all([
            fetch(`https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidTa?stnId=${stnId}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`),
            fetch(`https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidLandFcst?regId=${regId}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`)
        ]);

        const tempText = await tempRes.text();
        const landText = await landRes.text();

        console.log(`[MidForecast] Temp status: ${tempRes.status}, Land status: ${landRes.status}`);

        let tempData, landData;
        try {
            tempData = JSON.parse(tempText);
            landData = JSON.parse(landText);
        } catch (e) {
            return res.status(200).json({
                error: {
                    code: 'PARSE_ERROR',
                    message: '중기예보 API 응답 파싱 오류'
                }
            });
        }

        // 에러 체크
        if (tempData.response?.header?.resultCode !== '00') {
            console.log('[MidForecast] Temp error:', tempData.response?.header?.resultMsg);
        }
        if (landData.response?.header?.resultCode !== '00') {
            console.log('[MidForecast] Land error:', landData.response?.header?.resultMsg);
        }

        res.status(200).json({
            temperature: tempData,
            land: landData,
            tmFc: tmFc
        });

    } catch (error) {
        console.error('MidForecast API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '중기예보 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};

