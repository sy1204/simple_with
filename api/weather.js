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
        
        let year = koreaTime.getUTCFullYear();
        let month = koreaTime.getUTCMonth() + 1;
        let day = koreaTime.getUTCDate();
        let hour = koreaTime.getUTCHours();
        const minutes = koreaTime.getUTCMinutes();

        let baseDate, baseTime, endpoint;

        if (type === 'ultra') {
            // 초단기실황: 매시 정각 발표, 40분 후부터 사용 가능
            if (minutes < 40) {
                hour = hour - 1;
                if (hour < 0) {
                    hour = 23;
                    day = day - 1;
                    if (day < 1) {
                        month = month - 1;
                        if (month < 1) { month = 12; year = year - 1; }
                        day = new Date(year, month, 0).getDate();
                    }
                }
            }
            baseDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
            baseTime = String(hour).padStart(2, '0') + '00';
            endpoint = 'getUltraSrtNcst';
        } else {
            // 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표 (발표 후 약 10분)
            const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
            let baseHour = 23;
            
            // 현재 시간 기준 가장 최근 발표시간 찾기
            for (let i = baseHours.length - 1; i >= 0; i--) {
                if (hour > baseHours[i] || (hour === baseHours[i] && minutes >= 10)) {
                    baseHour = baseHours[i];
                    break;
                }
                if (i === 0) {
                    // 오늘 첫 발표 전이면 어제 23시 사용
                    baseHour = 23;
                    day = day - 1;
                    if (day < 1) {
                        month = month - 1;
                        if (month < 1) { month = 12; year = year - 1; }
                        day = new Date(year, month, 0).getDate();
                    }
                }
            }
            
            baseDate = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
            baseTime = String(baseHour).padStart(2, '0') + '00';
            endpoint = 'getVilageFcst';
        }

        // 기상청 API허브 URL 형식
        const numOfRows = type === 'ultra' ? 100 : 1000; // 단기예보는 더 많은 데이터
        const apiUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/${endpoint}?pageNo=1&numOfRows=${numOfRows}&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}&authKey=${KMA_API_KEY}`;
        
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
