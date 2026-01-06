// c:\Users\User\workspace\simple_with\api\weather.js
// 기상청 공공데이터 API 프록시
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

    const { nx = '60', ny = '127', type = 'ultra' } = req.query;
    
    // 기상청 API 키
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
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const baseDate = koreaTime.toISOString().slice(0, 10).replace(/-/g, '');
        
        // 시간 계산
        let baseTime;
        if (type === 'ultra') {
            // 초단기실황: 매시 정각 발표 (10분 후부터 사용 가능)
            let hour = koreaTime.getUTCHours();
            const minutes = koreaTime.getUTCMinutes();
            // 발표 후 10분이 지나지 않았다면 이전 시간 사용
            if (minutes < 10) {
                hour = hour - 1;
                if (hour < 0) hour = 23;
            }
            baseTime = String(hour).padStart(2, '0') + '00';
        } else {
            // 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표
            const hours = [2, 5, 8, 11, 14, 17, 20, 23];
            const currentHour = koreaTime.getUTCHours();
            let baseHour = hours.filter(h => h <= currentHour).pop();
            if (baseHour === undefined) baseHour = 23;
            baseTime = String(baseHour).padStart(2, '0') + '00';
        }

        const endpoint = type === 'ultra' 
            ? 'getUltraSrtNcst'  // 초단기실황
            : 'getVilageFcst';   // 단기예보

        // 공공데이터포털 API 키는 이미 인코딩되어 있으므로 그대로 사용
        const apiUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/${endpoint}?serviceKey=${KMA_API_KEY}&numOfRows=100&pageNo=1&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
        
        console.log(`[Weather] Requesting: ${baseDate} ${baseTime}, nx=${nx}, ny=${ny}`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `기상청 API 연결 실패 (상태 코드: ${response.status})`
                }
            });
        }

        const responseText = await response.text();
        
        // 빈 응답 처리
        if (!responseText || responseText.trim() === '') {
            return res.status(200).json({
                error: {
                    code: 'EMPTY_RESPONSE',
                    message: '기상청 API가 빈 응답을 반환했습니다.'
                }
            });
        }

        // JSON 파싱
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return res.status(200).json({
                error: {
                    code: 'PARSE_ERROR',
                    message: '기상청 API 응답을 파싱할 수 없습니다.'
                }
            });
        }

        // 기상청 API 에러 체크
        if (data.response?.header?.resultCode !== '00') {
            return res.status(200).json({
                error: {
                    code: 'API_ERROR',
                    message: data.response?.header?.resultMsg || '기상청 API 오류가 발생했습니다.'
                }
            });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('Weather API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '날씨 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};

