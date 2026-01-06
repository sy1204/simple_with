// c:\Users\User\workspace\simple_with\api\english.js
// 영어사전 API 프록시 (영한/한영 자동 전환)
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

    // 한글 포함 여부로 언어 감지
    const isKorean = /[가-힣]/.test(q);

    try {
        if (isKorean) {
            // 한글 입력 → 한영사전 (파파고로 영어 번역)
            return await handleKoreanToEnglish(q, CLIENT_ID, CLIENT_SECRET, res);
        } else {
            // 영어 입력 → 영한사전 (Free Dictionary + 파파고)
            return await handleEnglishToKorean(q, CLIENT_ID, CLIENT_SECRET, res);
        }
    } catch (error) {
        console.error('English Dictionary API Error:', error);
        res.status(500).json({
            error: {
                code: 'API_ERROR',
                message: error.message || '사전 API 호출 중 오류가 발생했습니다.'
            }
        });
    }
};

// 한글 → 영어 (한영사전)
async function handleKoreanToEnglish(query, clientId, clientSecret, res) {
    if (!clientId || !clientSecret) {
        return res.status(200).json({
            error: {
                code: 'CONFIG_ERROR',
                message: '한영사전을 사용하려면 네이버 API 키가 필요합니다.'
            }
        });
    }

    try {
        const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
            method: 'POST',
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `source=ko&target=en&text=${encodeURIComponent(query)}`
        });

        if (!translateResponse.ok) {
            return res.status(200).json({
                error: {
                    code: 'API_FETCH_FAILED',
                    message: `파파고 API 연결 실패 (상태 코드: ${translateResponse.status})`
                }
            });
        }

        const translateData = await translateResponse.json();
        const translatedText = translateData.message?.result?.translatedText || '';

        if (!translatedText) {
            return res.status(200).json({
                error: {
                    code: 'NOT_FOUND',
                    message: `'${query}'에 대한 번역 결과가 없습니다.`
                }
            });
        }

        // 영어 단어에 대한 추가 정보 가져오기 (단어인 경우)
        let meanings = [];
        let phonetic = '';
        let audioUrl = '';

        // 단일 단어인 경우 Free Dictionary에서 추가 정보 가져오기
        const words = translatedText.split(' ');
        if (words.length <= 2) {
            const mainWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
            if (mainWord) {
                try {
                    const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(mainWord)}`);
                    if (dictResponse.ok) {
                        const dictData = await dictResponse.json();
                        if (dictData && dictData[0]) {
                            const entry = dictData[0];
                            phonetic = entry.phonetic || '';
                            if (entry.phonetics) {
                                for (const p of entry.phonetics) {
                                    if (p.text && !phonetic) phonetic = p.text;
                                    if (p.audio && !audioUrl) audioUrl = p.audio;
                                }
                            }
                            meanings = (entry.meanings || []).slice(0, 2).map(m => ({
                                partOfSpeech: m.partOfSpeech || '',
                                definitions: (m.definitions || []).slice(0, 2).map(d => ({
                                    definition: d.definition || '',
                                    example: d.example || ''
                                }))
                            }));
                        }
                    }
                } catch (e) {
                    // 추가 정보 실패해도 번역 결과는 반환
                }
            }
        }

        return res.status(200).json({
            word: query,
            englishMeaning: translatedText,
            koreanMeaning: '',
            phonetic: phonetic,
            audio: audioUrl,
            meanings: meanings,
            source: 'korean-to-english',
            direction: 'ko→en'
        });

    } catch (error) {
        throw error;
    }
}

// 영어 → 한글 (영한사전)
async function handleEnglishToKorean(query, clientId, clientSecret, res) {
    // 1. Free Dictionary API로 영어 정의 가져오기
    const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
    
    let dictData = null;
    let koreanMeaning = '';

    if (dictResponse.ok) {
        dictData = await dictResponse.json();
    }

    // 2. 파파고로 한글 뜻 번역 (API 키가 있는 경우)
    if (clientId && clientSecret) {
        try {
            const translateResponse = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
                method: 'POST',
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `source=en&target=ko&text=${encodeURIComponent(query)}`
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
                word: query,
                koreanMeaning: koreanMeaning,
                englishMeaning: '',
                phonetic: '',
                audio: '',
                meanings: [],
                source: 'papago',
                direction: 'en→ko'
            });
        } else {
            return res.status(200).json({
                error: {
                    code: 'NOT_FOUND',
                    message: `'${query}'에 대한 검색 결과가 없습니다.`
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
        word: entry.word || query,
        koreanMeaning: koreanMeaning,
        englishMeaning: '',
        phonetic: phonetic,
        audio: audioUrl,
        meanings: meanings,
        source: 'freedictionary',
        direction: 'en→ko'
    };

    res.status(200).json(result);
}
