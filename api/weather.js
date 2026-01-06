// c:\Users\User\workspace\simple_with\api\weather.js
// 기상청 API허브 프록시
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
        const kstOffset = 9 * 60 * 60 * 1000;
        const koreaTime = new Date(now.getTime() + kstOffset);
        
        const year = koreaTime.getUTCFullYear();
        const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(koreaTime.getUTCDate()).padStart(2, '0');
        const baseDate = `${year}${month}${day}`;
        
        // 시간 계산
        let hour = koreaTime.getUTCHours();
        const minutes = koreaTime.getUTCMinutes();
        
        // 초단기실황: 매시 정각 발표, 40분 후부터 사용 가능
        if (minutes < 40) {
            hour = hour - 1;
            if (hour < 0) hour = 23;
        }
        const baseTime = String(hour).padStart(2, '0') + '00';

        const endpoint = type === 'ultra' 
            ? 'getUltraSrtNcst'  // 초단기실황
            : 'getVilageFcst';   // 단기예보

        // 기상청 API허브 URL 형식
        const apiUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/${endpoint}?pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}&authKey=${KMA_API_KEY}`;
        
        console.log(`[Weather] Request: ${baseDate} ${baseTime}, nx=${nx}, ny=${ny}`);

        const response = await fetch(apiUrl);
        const responseText = await response.text();
        
        console.log(`[Weather] Response status: ${response.status}`);
        console.log(`[Weather] Response preview: ${responseText.substring(0, 200)}`);

        if (!response.ok) {
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `기상청 API 연결 실패 (상태 코드: ${response.status})`
                }
            });
        }

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
            // HTML 에러 페이지 등 반환 시
            return res.status(200).json({
                error: {
                    code: 'PARSE_ERROR',
                    message: '기상청 API 응답을 파싱할 수 없습니다. 응답: ' + responseText.substring(0, 100)
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
