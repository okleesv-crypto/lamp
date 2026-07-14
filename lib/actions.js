'use server';

import Papa from 'papaparse';

function parseName(str) {
  if (!str) return { eng: '', kor: '' };
  const match = str.match(/^([a-zA-Z\s]+?)\s*([가-힣]+)$/);
  if (match) {
    return { eng: match[1].trim(), kor: match[2].trim() };
  }
  return { eng: '', kor: str.trim() };
}

// 하나의 CSV 데이터를 파싱하는 순수 함수
function parseSingleSheetCsv(csvText, url, gid) {
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = results.data;
        
        let report = {
          id: btoa(url + gid).substring(0, 15),
          timestamp: new Date().toISOString(),
          student: '알 수 없음',
          koreanName: '',
          englishName: '',
          school: '',
          grade: '',
          period: '',
          book: '',
          pages: '',
          evaluation: '',
          teacher: '',
          status: 'published',
          date: new Date().toISOString().split('T')[0],
          url: url
        };

        let currentEvalSection = '';
        let evaluations = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const col0 = (row[0] || '').trim();
          const col1 = (row[1] || '').trim();
          const col2 = (row[2] || '').trim();
          const col3 = (row[3] || '').trim();
          
          if (col0.includes('Month:')) report.period = col1;
          else if (col0.includes('Teacher')) report.teacher = col1;
          else if (col0.includes("Student's Name")) {
            report.student = col1;
            const parsed = parseName(col1);
            report.englishName = parsed.eng;
            report.koreanName = parsed.kor;
            
            if (col2.includes('School year')) {
              report.grade = col3;
            }
          }
          else if (col0.includes('Name') && col0.includes('Textbook')) report.book = col1;
          else if (col0.includes('Textbook pages')) report.pages = col1;
          else if (col0.includes('Participation') || col0.includes('H/W') || col0.includes('StoryBook')) {
            currentEvalSection = col0.replace(/\n/g, ' ').trim();
            if (col1) evaluations.push(`[${currentEvalSection}]\n${col1}`);
          } 
          else if (col0 === '' && col1 && currentEvalSection) {
            if (!col1.includes('* This report')) {
               evaluations.push(`${col1}`);
            }
          }
        }
        
        if (evaluations.length > 0) {
           report.evaluation = evaluations.join('\n\n');
        }

        // 만약 기간(Month)이나 이름이 없다면 빈 시트로 간주
        if (!report.period || !report.student) {
          resolve(null);
        } else {
          resolve(report);
        }
      },
      error: () => resolve(null)
    });
  });
}

// URL에서 여러 탭(시트)을 모두 가져오는 서버 액션
export async function fetchStudentReportsAction(url) {
  try {
    const baseUrl = url.split('/edit')[0];
    const htmlViewUrl = baseUrl + '/htmlview';
    
    // 서버측에서 htmlview를 가져와서 모든 시트 ID(gid)를 추출. (Vercel Data Cache 사용)
    const htmlRes = await fetch(htmlViewUrl, { next: { revalidate: 300 } });
    if (!htmlRes.ok) throw new Error('htmlview fetch failed');
    const htmlText = await htmlRes.text();
    
    // 정규식으로 gid= 숫자들 추출
    const gidMatches = [...htmlText.matchAll(/gid=(\d+)/g)].map(m => m[1]);
    let uniqueGids = [...new Set(gidMatches)];
    
    // gid가 하나도 안찾아지면 기본값(첫번째 시트)으로 하나만 요청
    if (uniqueGids.length === 0) {
      uniqueGids = ['0'];
    }

    // 모든 시트를 병렬로 다운로드 및 파싱 (Vercel Data Cache 사용)
    const promises = uniqueGids.map(async (gid) => {
      const csvUrl = `${baseUrl}/export?format=csv&gid=${gid}`;
      const csvRes = await fetch(csvUrl, { next: { revalidate: 300 } });
      if (!csvRes.ok) return null;
      const csvText = await csvRes.text();
      return parseSingleSheetCsv(csvText, url, gid);
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  } catch (err) {
    console.error("fetchStudentReportsAction 실패:", err);
    return [];
  }
}

export async function fetchAllReportsAction(links) {
  if (!links || links.length === 0) return [];
  
  const allPromises = links.map(link => fetchStudentReportsAction(link.url));
  const nestedResults = await Promise.all(allPromises);
  
  // 2차원 배열을 1차원으로 평탄화(flatten)
  return nestedResults.flat();
}

// 마스터 시트에서 모든 학생들의 구글 시트 링크를 가져오는 액션
export async function getMasterSheetLinksAction() {
  const masterUrl = process.env.MASTER_SHEET_URL;
  if (!masterUrl) return [];

  try {
    const baseUrl = masterUrl.split('/edit')[0];
    const csvUrl = `${baseUrl}/export?format=csv`;
    
    // 마스터 시트 데이터 캐싱 (5분)
    const res = await fetch(csvUrl, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    
    const csvText = await res.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const links = results.data
            .map(row => (row[0] || '').trim())
            .filter(url => url.includes('docs.google.com/spreadsheets'));
            
          resolve(links.map(url => ({ url })));
        },
        error: () => resolve([])
      });
    });
  } catch (err) {
    console.error('Master Sheet fetch error:', err);
    return [];
  }
}

// 마스터 시트에 새로운 학생 링크를 추가하는 액션 (Apps Script 연동)
export async function addLinkToMasterSheetAction(newUrl) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  
  if (!scriptUrl) {
    return { success: false, message: '서버에 APPS_SCRIPT_URL 환경변수가 설정되지 않았습니다.' };
  }
  
  if (!newUrl || !newUrl.includes('docs.google.com/spreadsheets')) {
    return { success: false, message: '올바른 구글 시트 링크가 아닙니다.' };
  }

  try {
    // Vercel Data Cache 강제 초기화 (다음 번에 새 목록을 불러오도록 유도)
    // 참고: revalidatePath('/') 또는 revalidateTag 등을 쓰면 좋지만 
    // 여기서는 간단히 외부 fetch만 합니다.
    
    const formData = new FormData();
    formData.append('url', newUrl);

    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    
    if (data.result === 'success') {
      return { success: true };
    } else {
      return { success: false, message: data.message || '저장 중 오류가 발생했습니다.' };
    }
  } catch (error) {
    console.error('Failed to add link to master sheet:', error);
    return { success: false, message: '네트워크 또는 서버 오류가 발생했습니다.' };
  }
}

