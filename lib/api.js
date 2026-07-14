import Papa from 'papaparse';

function parseName(str) {
  if (!str) return { eng: '', kor: '' };
  const match = str.match(/^([a-zA-Z\s]+?)\s*([가-힣]+)$/);
  if (match) {
    return { eng: match[1].trim(), kor: match[2].trim() };
  }
  return { eng: '', kor: str.trim() };
}

export async function fetchStudentReport(url) {
  try {
    let csvUrl = url;
    if (url.includes('/edit')) {
      csvUrl = url.split('/edit')[0] + '/export?format=csv';
    }

    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('네트워크 오류');
    
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false, 
        skipEmptyLines: false,
        complete: (results) => {
          const rows = results.data;
          
          let report = {
            id: btoa(url).substring(0, 10),
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
                // "AIS1" 
                report.grade = col3;
              }
              // 학교 정보는 어디에 있는지 확인 필요, 일단 빈 값
              // 사진상 "Haon 김하온 (IS 2)" 처럼 시트 제목에 있거나?
              // 아니면 "School year"에 학교+학년이 다 있나?
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

          resolve(report);
        },
        error: reject
      });
    });
  } catch (err) {
    console.error("데이터 패치 실패:", err);
    return null;
  }
}

export async function fetchAllReports(links) {
  if (!links || links.length === 0) return [];
  const promises = links.map(link => fetchStudentReport(link.url));
  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}
