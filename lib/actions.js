'use server';

import Papa from 'papaparse';
import { revalidatePath } from 'next/cache';

function parseName(str) {
  if (!str) return { eng: '', kor: '' };
  
  // 학교 이름 등 괄호 안의 내용을 먼저 제거합니다. (예: Ji Woo 연지우 (SSIS 5) -> Ji Woo 연지우)
  let cleanStr = str.replace(/\([^)]+\)/g, '').trim();
  
  // 1. "한글이름 (영어이름)" 또는 "영어이름 (한글이름)"
  let match = str.match(/^([가-힣]+)\s*\(([a-zA-Z\s-]+)\)$/);
  if (match) {
    return { eng: match[2].trim(), kor: match[1].trim() };
  }
  
  match = str.match(/^([a-zA-Z\s-]+)\s*\(([가-힣]+)\)$/);
  if (match) {
    return { eng: match[1].trim(), kor: match[2].trim() };
  }

  // 2. "English Korean" 또는 "Korean English" (괄호 제거된 문자열에서 검사)
  match = cleanStr.match(/^([a-zA-Z\s-]+?)\s*([가-힣]+)$/);
  if (match) {
    return { eng: match[1].trim(), kor: match[2].trim() };
  }
  
  match = cleanStr.match(/^([가-힣]+)\s*([a-zA-Z\s-]+)$/);
  if (match) {
    return { eng: match[2].trim(), kor: match[1].trim() };
  }
  
  // 3. 순수 영어나 한글
  if (/^[a-zA-Z\s-]+$/.test(cleanStr)) {
    return { eng: cleanStr, kor: '' };
  }
  
  return { eng: '', kor: cleanStr };
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

        // 1. 전체 시트 타이틀에서 Weekly / Monthly 파악 (앞부분 10줄만 스캔)
        let overallType = 'Report';
        for (let i = 0; i < Math.min(10, rows.length); i++) {
           if (!rows[i]) continue;
           const rowStr = rows[i].join(' ').toLowerCase();
           if (rowStr.includes('weekly')) {
             overallType = 'Weekly';
             break;
           } else if (rowStr.includes('monthly') || rowStr.includes('month report')) {
             overallType = 'Monthly';
             break;
           }
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          
          let matchedHeader = false;
          
          for (let c = 0; c <= 3; c++) {
            const cell = (row[c] || '').trim();
            const cellLower = cell.toLowerCase();
            const nextCell = (row[c+1] || '').trim() || (row[c+2] || '').trim();
            
            if (!cellLower) continue;

            if ((cellLower.includes('month') || cellLower.includes('week') || cellLower.includes('period') || cellLower.includes('date')) && !cellLower.includes('textbook') && !cellLower.includes('pages') && cell.length < 60) {
              let rawStr = cellLower.replace(/(month|weekly|week|period|date):?/i, '').trim() || nextCell;
              
              if (overallType !== 'Report') {
                report.type = overallType;
              } else if (cellLower.includes('week') || rawStr.toLowerCase().includes('week')) {
                report.type = 'Weekly';
              } else if (cellLower.includes('month') || rawStr.toLowerCase().includes('month')) {
                report.type = 'Monthly';
              } else {
                report.type = 'Report';
              }
              
              // 날짜 포맷 깔끔하게 정리
              let cleanDate = rawStr.replace(/week\s*\d*/gi, '').replace(/month/gi, '').trim();
              cleanDate = cleanDate.replace(/-/g, '~').replace(/\s*~\s*/g, ' ~ ');
              cleanDate = cleanDate.replace(/\.\s+/g, '.'); // 2024. 07. 10 -> 2024.07.10
              report.period = cleanDate || rawStr;
              matchedHeader = true;
            }
            else if (cellLower.includes('teacher') && cell.length < 60) {
              report.teacher = cellLower.replace(/teacher[\s\S]*name:?/i, '').trim() || nextCell;
              matchedHeader = true;
            }
            else if (cellLower.includes('student') && cellLower.includes('name') && cell.length < 60) {
              report.student = cellLower.replace(/student[\s\S]*name:?/i, '').trim() || nextCell;
              const parsed = parseName(report.student);
              report.englishName = parsed.eng;
              report.koreanName = parsed.kor;
              matchedHeader = true;
            }
            else if (cellLower.includes('school') && cellLower.includes('year') && cell.length < 60) {
              report.grade = cellLower.replace(/school[\s\S]*year:?/i, '').trim() || nextCell;
              matchedHeader = true;
            }
            else if (cellLower.includes('name') && cellLower.includes('textbook') && cell.length < 60) {
              report.book = cellLower.replace(/name[\s\S]*textbook:?/i, '').trim() || nextCell;
              matchedHeader = true;
            }
            else if (cellLower.includes('textbook') && cellLower.includes('pages') && cell.length < 60) {
              report.pages = cellLower.replace(/textbook[\s\S]*pages[\s\S]*:?/i, '').trim() || nextCell;
              matchedHeader = true;
            }
            else if ((cellLower.includes('participation') || cellLower.includes('h/w') || cellLower.includes('storybook')) && cell.length < 60) {
              currentEvalSection = cell.replace(/\n/g, ' ').trim();
              if (nextCell) evaluations.push(`[${currentEvalSection}]\n${nextCell}`);
              matchedHeader = true;
            }
          }

          if (!matchedHeader && currentEvalSection) {
            const col1 = (row[1] || '').trim();
            const col2 = (row[2] || '').trim();
            const text = col1 || col2;
            if (text && !text.includes('* This report')) {
               evaluations.push(`${text}`);
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

    // 파일 제목(타이틀)에서 이름 추출 시도 (리포트가 비어있을 경우 대비)
    const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
    let documentTitle = titleMatch ? titleMatch[1].replace(' - Google Sheets', '').replace(' - Google 드라이브', '').replace(' - Google Drive', '').trim() : '';

    // 모든 시트를 병렬로 다운로드 및 파싱 (Vercel Data Cache 사용)
    const promises = uniqueGids.map(async (gid) => {
      const csvUrl = `${baseUrl}/export?format=csv&gid=${gid}`;
      const csvRes = await fetch(csvUrl, { next: { revalidate: 300 } });
      if (!csvRes.ok) return null;
      const csvText = await csvRes.text();
      return parseSingleSheetCsv(csvText, url, gid);
    });

    const results = await Promise.all(promises);
    let validReports = results.filter(r => r !== null);
    
    // 만약 유효한 리포트가 발견되었지만 이름이 '알 수 없음' 이거나 비어있다면, 
    // 파일 제목에서 이름을 추출해서 채워줍니다.
    if (documentTitle) {
      const parsedTitle = parseName(documentTitle);
      validReports = validReports.map(r => {
        if (!r.student || r.student === '알 수 없음') {
          r.student = documentTitle;
          r.koreanName = parsedTitle.kor || documentTitle;
          r.englishName = parsedTitle.eng;
        }
        return r;
      });
    }
    
    // 유효한 리포트가 하나도 없지만 문서 제목은 알아냈다면, 
    // 이름 메타데이터용 가짜(Placeholder) 리포트를 하나 만들어서 반환합니다.
    if (validReports.length === 0 && documentTitle) {
      const parsed = parseName(documentTitle);
      return [{
        url: url,
        student: documentTitle,
        koreanName: parsed.kor || documentTitle,
        englishName: parsed.eng,
        school: '',
        grade: '',
        isPlaceholder: true
      }];
    }
    
    return validReports;
  } catch (err) {
    console.error("fetchStudentReportsAction 실패:", err);
    return [];
  }
}

export async function fetchAllReportsAction(links) {
  try {
    const allResults = [];
    const BATCH_SIZE = 20; // 구글 서버 차단을 막기 위해 20명씩 끊어서 요청
    
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE);
      const promises = batch.map(link => fetchStudentReportsAction(link.url));
      const results = await Promise.all(promises);
      allResults.push(...results.flat());
      
      // 구글 서버에 너무 많은 부하를 주지 않도록 약간의 대기 시간 (300ms) 추가
      if (i + BATCH_SIZE < links.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return allResults;
  } catch (err) {
    console.error('All reports fetch error:', err);
    return [];
  }
}

export async function getMasterSheetLinksAction() {
  const masterUrl = process.env.MASTER_SHEET_URL;
  if (!masterUrl) return [];

  try {
    const baseUrl = masterUrl.split('/edit')[0];
    const csvUrl = `${baseUrl}/export?format=csv`;
    
    // 마스터 시트 데이터 실시간 반영을 위해 캐시 방지
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (!res.ok) return [];
    
    const csvText = await res.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const links = results.data
            .filter(row => {
               const url = (row[0] || '').trim();
               return url.includes('docs.google.com/spreadsheets');
            })
            .map(row => ({
               url: (row[0] || '').trim(),
               status: (row[1] || '').trim() || '재원',
               name: (row[2] || '').trim(),
               engName: (row[3] || '').trim(),
               school: (row[4] || '').trim(),
               grade: (row[5] || '').trim()
            }));
            
          // 중복 URL 제거 (가장 아래에 있는 최신 데이터 우선)
          const uniqueLinks = [];
          const seenUrls = new Set();
          
          for (let i = links.length - 1; i >= 0; i--) {
            const link = links[i];
            if (!seenUrls.has(link.url)) {
              seenUrls.add(link.url);
              uniqueLinks.unshift(link); // 원래 순서 유지
            }
          }
            
          resolve(uniqueLinks);
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
    // 1. 등록 전에 데이터를 먼저 파싱하여 메타데이터 추출
    const reports = await fetchStudentReportsAction(newUrl);
    let name = '';
    let engName = '';
    let school = '';
    let grade = '';
    
    if (reports && reports.length > 0) {
      reports.forEach(r => {
        if (!name || (r.koreanName && r.koreanName !== name && !name.match(/[가-힣]/))) {
          name = r.koreanName || r.student;
        }
        if (!engName && r.englishName) engName = r.englishName;
        if (!school && r.school) school = r.school;
        if (!grade && r.grade) grade = r.grade;
      });
    }

    // 2. URLSearchParams 사용 (Apps Script와 호환성 최고)
    const params = new URLSearchParams();
    params.append('action', 'add');
    params.append('url', newUrl);
    params.append('status', '재원');
    params.append('name', name);
    params.append('engName', engName);
    params.append('school', school);
    params.append('grade', grade);

    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const data = await res.json();
    
    if (data.result === 'success') {
      revalidatePath('/');
      revalidatePath('/settings');
      return { success: true };
    } else {
      return { success: false, message: data.message || '저장 중 오류가 발생했습니다.' };
    }
  } catch (error) {
    console.error('Failed to add link to master sheet:', error);
    return { success: false, message: '네트워크 또는 서버 오류가 발생했습니다.' };
  }
}

// 마스터 시트에서 학생 상태(재원/휴원/퇴원)를 업데이트하는 액션
export async function updateStudentStatusAction(targetUrl, status) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  
  if (!scriptUrl) {
    return { success: false, message: '서버에 APPS_SCRIPT_URL 환경변수가 설정되지 않았습니다.' };
  }
  
  if (!targetUrl || !status) {
    return { success: false, message: '올바른 요청이 아닙니다.' };
  }

  try {
    const params = new URLSearchParams();
    params.append('action', 'update_status');
    params.append('url', targetUrl);
    params.append('status', status);

    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const data = await res.json();
    
    if (data.result === 'success') {
      revalidatePath('/');
      revalidatePath('/settings');
      return { success: true };
    } else {
      return { success: false, message: data.message || '상태 변경 중 오류가 발생했습니다.' };
    }
  } catch (error) {
    console.error('Failed to update student status:', error);
    return { success: false, message: '네트워크 또는 서버 오류가 발생했습니다.' };
  }
}


