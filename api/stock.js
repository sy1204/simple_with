// 주식 정보 API 프록시
// Vercel Serverless Function
// Yahoo Finance API 사용 (무료, API 키 불필요)

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { symbol, type } = req.query;

    try {
        // type=index: 코스피/코스닥 지수 조회
        if (type === 'index') {
            const symbols = ['^KS11', '^KQ11']; // 코스피, 코스닥
            const results = {};

            for (const sym of symbols) {
                try {
                    const response = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
                        {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const quote = data.chart.result[0].meta;
                        const name = sym === '^KS11' ? 'KOSPI' : 'KOSDAQ';

                        results[name] = {
                            symbol: sym,
                            name: name,
                            price: quote.regularMarketPrice || 0,
                            change: quote.regularMarketPrice - quote.chartPreviousClose,
                            changePercent: ((quote.regularMarketPrice - quote.chartPreviousClose) / quote.chartPreviousClose * 100),
                            previousClose: quote.chartPreviousClose || 0
                        };
                    }
                } catch (err) {
                    console.error(`Error fetching ${sym}:`, err);
                }
            }

            res.status(200).json({ success: true, data: results });
            return;
        }

        // type=search: 개별 주식 조회
        if (type === 'search' && symbol) {
            // 한국 주식 심볼 형식: 삼성전자 = 005930.KS (코스피), 카카오 = 035720.KQ (코스닥)
            let searchSymbol = symbol;

            // 숫자만 입력된 경우 .KS 추가 (기본 코스피)
            if (/^\d{6}$/.test(symbol)) {
                searchSymbol = `${symbol}.KS`;
            }

            const response = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${searchSymbol}?interval=1d&range=1d`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            );

            if (!response.ok) {
                // .KS로 실패하면 .KQ (코스닥) 시도
                if (searchSymbol.endsWith('.KS')) {
                    searchSymbol = symbol + '.KQ';
                    const retryResponse = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${searchSymbol}?interval=1d&range=1d`,
                        {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        }
                    );

                    if (!retryResponse.ok) {
                        throw new Error('종목을 찾을 수 없습니다');
                    }

                    const data = await retryResponse.json();
                    const quote = data.chart.result[0].meta;

                    res.status(200).json({
                        success: true,
                        data: {
                            symbol: searchSymbol,
                            name: quote.symbol || searchSymbol,
                            price: quote.regularMarketPrice || 0,
                            change: quote.regularMarketPrice - quote.chartPreviousClose,
                            changePercent: ((quote.regularMarketPrice - quote.chartPreviousClose) / quote.chartPreviousClose * 100),
                            previousClose: quote.chartPreviousClose || 0,
                            currency: quote.currency || 'KRW',
                            market: searchSymbol.endsWith('.KS') ? '코스피' : '코스닥'
                        }
                    });
                    return;
                }

                throw new Error('종목을 찾을 수 없습니다');
            }

            const data = await response.json();
            const quote = data.chart.result[0].meta;

            res.status(200).json({
                success: true,
                data: {
                    symbol: searchSymbol,
                    name: quote.symbol || searchSymbol,
                    price: quote.regularMarketPrice || 0,
                    change: quote.regularMarketPrice - quote.chartPreviousClose,
                    changePercent: ((quote.regularMarketPrice - quote.chartPreviousClose) / quote.chartPreviousClose * 100),
                    previousClose: quote.chartPreviousClose || 0,
                    currency: quote.currency || 'KRW',
                    market: searchSymbol.endsWith('.KS') ? '코스피' : '코스닥'
                }
            });
            return;
        }

        res.status(400).json({
            success: false,
            error: '잘못된 요청입니다. type=index 또는 type=search&symbol=종목코드를 사용하세요.'
        });

    } catch (error) {
        console.error('Stock API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || '주식 정보를 불러올 수 없습니다'
        });
    }
};
