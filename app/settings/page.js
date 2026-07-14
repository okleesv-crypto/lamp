'use client';
import { useState, useEffect } from 'react';
import { Link as LinkIcon, AlertCircle, CheckCircle, ExternalLink, Plus, Loader2, Trash2, User, Building, GraduationCap } from 'lucide-react';
import { addLinkToMasterSheetAction, deleteLinkFromMasterSheetAction, restoreLinkFromMasterSheetAction, getMasterSheetLinksAction, fetchAllReportsAction } from '@/lib/actions';
import { getCachedReports } from '@/lib/store';

export default function SettingsPage() {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setIsLoadingStudents(true);
    try {
      const links = await getMasterSheetLinksAction();
      
      // 1. 캐시된 데이터를 먼저 확인하여 메타데이터 추출
      let data = getCachedReports();
      
      // 2. 없으면 백그라운드에서 전체 리포트 가져오기
      if (!data || data.length === 0) {
         data = await fetchAllReportsAction(links);
      }
      
        // URL별로 메타데이터 그룹화
      const groupedMap = new Map();
      if (data) {
        data.forEach(r => {
          const key = r.url;
          if (!key) return;
          
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              url: r.url,
              name: r.koreanName || r.student,
              school: r.school || '',
              grade: r.grade || ''
            });
          } else {
            const existing = groupedMap.get(key);
            if (!existing.name || (r.koreanName && r.koreanName !== existing.name && !existing.name.match(/[가-힣]/))) {
              existing.name = r.koreanName || r.student;
            }
            if (!existing.school && r.school) existing.school = r.school;
            if (!existing.grade && r.grade) existing.grade = r.grade;
          }
        });
      }

      // 등록된 링크(links)를 기준으로 목록 완성
      const studentList = links.map(link => {
        const meta = groupedMap.get(link.url);
        return {
          url: link.url,
          name: meta ? meta.name : '알 수 없음(리포트 없음)',
          school: meta ? meta.school : '',
          grade: meta ? meta.grade : ''
        };
      });

      setStudents(studentList);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingStudents(false);
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!url) return alert('구글 시트 링크를 입력해주세요.');
    
    setIsAdding(true);
    setMessage('');
    
    const result = await addLinkToMasterSheetAction(url);
    
    if (result.success) {
      setMessage('✅ 마스터 시트에 성공적으로 추가되었습니다! (대시보드에 즉시 반영됨)');
      setUrl('');
      loadStudents(); // 목록 새로고침
    } else {
      setMessage(`❌ 실패: ${result.message}`);
    }
    
    setIsAdding(false);
  };

  const handleDelete = async (targetUrl, studentName) => {
    if (!confirm(`정말로 '${studentName}' 학생을 퇴원(마스터 시트에서 삭제) 처리하시겠습니까?\n대시보드에서 즉시 사라집니다.`)) {
      return;
    }

    setIsDeleting(true);
    setMessage('');

    const result = await deleteLinkFromMasterSheetAction(targetUrl);

    if (result.success) {
      alert(`✅ '${studentName}' 학생이 성공적으로 퇴원 처리되었습니다.`);
      loadStudents(); // 목록 새로고침
    } else {
      alert(`❌ 삭제 실패: ${result.message}`);
    }

    setIsDeleting(false);
  };

  const handleRestore = async (targetUrl, studentName) => {
    if (!confirm(`'${studentName}' 학생을 다시 복구(활성화) 하시겠습니까?\n대시보드에 다시 나타납니다.`)) {
      return;
    }

    setIsDeleting(true);
    setMessage('');

    const result = await restoreLinkFromMasterSheetAction(targetUrl);

    if (result.success) {
      alert(`✅ '${studentName}' 학생이 성공적으로 복구되었습니다.`);
      loadStudents(); // 목록 새로고침
    } else {
      alert(`❌ 복구 실패: ${result.message}`);
    }

    setIsDeleting(false);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in relative">
      {/* 전체 화면 로딩 오버레이 (삭제 중일 때) */}
      {isDeleting && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
          <p className="text-gray-800 font-bold text-lg">처리 중입니다...</p>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-2">학생 추가 및 설정</h1>
      <p className="text-gray-500 mb-10">
        여기에 개별 학생의 구글 시트 링크를 붙여넣으면, 자동으로 마스터 시트에 등록됩니다.
      </p>

      {/* 새 링크 추가 폼 */}
      <form onSubmit={handleAdd} className="glass-card p-8 mb-10 border border-gray-100 shadow-sm relative overflow-hidden">
        {isAdding && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
            <p className="text-gray-700 font-medium">마스터 시트에 저장하는 중...</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">구글 시트 공유 링크 추가</label>
          <div className="relative flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="url" 
                className="input-glass py-3 pr-4 pl-11 text-lg" 
                placeholder="https://docs.google.com/spreadsheets/d/..." 
                value={url} 
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-[0_4px_14px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus className="w-5 h-5" /> 마스터 시트에 추가
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm font-medium ${message.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}
        </div>
      </form>

      {/* 등록된 학생 목록 */}
      <div className="glass-card p-8 mb-10 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-red-500" /> 현재 등록된 학생 목록 ({students.length}명)
        </h2>
        
        {isLoadingStudents ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
            등록된 학생이 없습니다. 위에서 학생 링크를 추가해주세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
                  <th className="py-4 px-4 font-semibold">학생 이름</th>
                  <th className="py-4 px-4 font-semibold">학교 / 학년</th>
                  <th className="py-4 px-4 font-semibold hidden md:table-cell">시트 링크</th>
                  <th className="py-4 px-4 font-semibold text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${student.hidden ? 'opacity-50 bg-gray-50' : ''}`}>
                    <td className="py-4 px-4 font-bold text-gray-900">
                      {student.name}
                      {student.hidden && <span className="ml-2 text-xs font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">퇴원(숨김)</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {student.school || student.grade ? (
                        <div className="flex flex-col gap-1">
                          {student.school && <span className="flex items-center gap-1"><Building className="w-3 h-3 text-gray-400"/> {student.school}</span>}
                          {student.grade && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3 text-gray-400"/> {student.grade}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">정보 없음</span>
                      )}
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <a href={student.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm truncate max-w-[200px]">
                        <ExternalLink className="w-3 h-3" /> 링크 열기
                      </a>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {student.hidden ? (
                        <button 
                          onClick={() => handleRestore(student.url, student.name)}
                          className="text-green-600 hover:text-white border border-green-200 hover:bg-green-500 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle className="w-4 h-4" /> 복구
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDelete(student.url, student.name)}
                          className="text-red-500 hover:text-white border border-red-200 hover:bg-red-500 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" /> 퇴원
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
         <a href="/" className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
           대시보드로 돌아가기
         </a>
      </div>
    </main>
  );
}
