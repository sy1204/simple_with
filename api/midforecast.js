// c:\Users\User\workspace\simple_with\api\midforecast.js
// 기상청 중기예보 API 프록시
// Vercel Serverless Function

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { regId = '11B00000', regIdTemp = '11B10101' } = req.query;
    const KMA_API_KEY = process.env.KMA_API_KEY;

    if (!KMA_API_KEY) {
        return res.status(200).json({
            error: { code: 'CONFIG_ERROR', message: 'KMA_API_KEY가 설정되지 않았습니다.' }
        });
    }

    try {
        const now = new Date();
        const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        let year = kstNow.getUTCFullYear();
        let month = kstNow.getUTCMonth() + 1;
        let day = kstNow.getUTCDate();
        let hour = kstNow.getUTCHours();

        let baseTime;
        if (hour < 6) {
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

        // 중기기온조회(getMidTa)와 중기육상예보조회(getMidLandFcst)
        // API허브의 엔드포인트와 파라미터 확인
        const tempUrl = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidTa?regId=${regIdTemp}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`;
        const landUrl = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidLandFcst?regId=${regId}&tmFc=${tmFc}&dataType=JSON&authKey=${KMA_API_KEY}`;

        console.log(`[MidForecast] Request tmFc: ${tmFc}`);

        const [tempRes, landRes] = await Promise.all([
            fetch(tempUrl),
            fetch(landUrl)
        ]);

        const tempData = await tempRes.json();
        const landData = await landRes.json();

        // API허브 특유의 에러 형식 처리 ({"result":{"status":403,...}})
        if (tempData.result && tempData.result.status !== 200) {
            return res.status(200).json({ error: { code: 'API_ERROR', message: `기온조회: ${tempData.result.message}` } });
        }
        if (landData.result && landData.result.status !== 200) {
            return res.status(200).json({ error: { code: 'API_ERROR', message: `육상예보: ${landData.result.message}` } });
        }

        res.status(200).json({ temperature: tempData, land: landData, tmFc });

    } catch (error) {
        res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
