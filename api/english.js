// c:\Users\User\workspace\simple_with\api\english.js
// 영어사전 API 프록시 (Free Dictionary API + 파파고 번역)
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

    const { q } = req.query;

    if (!q) {
        return res.status(400).json({
            error: {
                code: 'MISSING_PARAM',
                message: '검색어(q)가 필요합니다.'
            }
        });
    }

    // 네이버 API 키 (파파고 번역용)
    const CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    try {
        // 1. Free Dictionary API로 영어 정의 가져오기
        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`);
        
        let dictData = null;
        let koreanMeaning = '';

        if (dictResponse.ok) {
            dictData = await dictResponse.json();
        }

        // 2. 파파고로 한글 뜻 번역 (API 키가 있는 경우)
        if (CLIENT_ID && CLIENT_SECRET) {
            try {
                const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
                    method: 'POST',
                    headers: {
                        'X-Naver-Client-Id': CLIENT_ID,
                        'X-Naver-Client-Secret': CLIENT_SECRET,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `source=en&target=ko&text=${encodeURIComponent(q)}`
                });

                if (translateResponse.ok) {
                    const translateData = await translateResponse.json();
                    koreanMeaning = translateData.message?.result?.translatedText || '';
                }
            } catch (e) {
                console.error('Papago translation error:', e);
            }
        }

        // 3. 응답 데이터 구성
        if (!dictData || dictData.title === 'No Definitions Found') {
            // 영어사전에서 찾지 못한 경우
            if (koreanMeaning) {
                // 파파고 번역 결과만 반환
                return res.status(200).json({
                    word: q,
                    koreanMeaning: koreanMeaning,
                    phonetic: '',
                    audio: '',
                    meanings: [],
                    source: 'papago'
                });
            } else {
                return res.status(200).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: `'${q}'에 대한 검색 결과가 없습니다.`
                    }
                });
            }
        }

        // Free Dictionary API 데이터 파싱
        const entry = dictData[0];
        
        // 발음 정보
        let phonetic = entry.phonetic || '';
        let audioUrl = '';
        
        if (entry.phonetics && entry.phonetics.length > 0) {
            for (const p of entry.phonetics) {
                if (p.text && !phonetic) phonetic = p.text;
                if (p.audio && !audioUrl) audioUrl = p.audio;
            }
        }

        // 의미 정보 파싱
        const meanings = (entry.meanings || []).map(meaning => ({
            partOfSpeech: meaning.partOfSpeech || '',
            definitions: (meaning.definitions || []).slice(0, 3).map(def => ({
                definition: def.definition || '',
                example: def.example || '',
                synonyms: (def.synonyms || []).slice(0, 5)
            }))
        }));

        const result = {
            word: entry.word || q,
            koreanMeaning: koreanMeaning,
            phonetic: phonetic,
            audio: audioUrl,
            meanings: meanings,
            source: 'freedictionary'
        };

        res.status(200).json(result);

    } catch (error) {
        console.error('English Dictionary API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '영어사전 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};
