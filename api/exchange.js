// 실시간 환율 API 프록시
// Vercel Serverless Function
// 무료 API: frankfurter.app (API 키 불필요)

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // frankfurter.app API - USD 기준 환율 조회
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,KRW,JPY,CNY,GBP');
        
        if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();
        
        // USD 기준 환율로 변환 (USD = 1)
        const rates = {
            USD: 1,
            EUR: data.rates.EUR || 0.92,
            KRW: data.rates.KRW || 1350,
            JPY: data.rates.JPY || 157,
            CNY: data.rates.CNY || 7.2,
            GBP: data.rates.GBP || 0.79
        };

        res.status(200).json({
            success: true,
            date: data.date,
            base: 'USD',
            rates: rates
        });

    } catch (error) {
        console.error('Exchange API Error:', error);
        // 에러 시 기본값 반환
        res.status(200).json({
            success: false,
            date: new Date().toISOString().split('T')[0],
            base: 'USD',
            rates: {
                USD: 1,
                EUR: 0.92,
                KRW: 1350,
                JPY: 157,
                CNY: 7.2,
                GBP: 0.79
            },
            error: error.message
        });
    }
};

