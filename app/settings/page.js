'use client';
import { useState, useEffect } from 'react';
import { Link as LinkIcon, AlertCircle, CheckCircle, ExternalLink, Plus, Loader2, Trash2, User, Building, GraduationCap } from 'lucide-react';
import { addLinkToMasterSheetAction, updateStudentStatusAction, getMasterSheetLinksAction, fetchAllReportsAction } from '@/lib/actions';
import { getCachedReports, removeCachedReportsByUrl } from '@/lib/store';
import { findTextbookLevel } from '@/lib/textbooks';
import { BookOpen, Search } from 'lucide-react';

export default function SettingsPage() {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'books'
  const [reports, setReports] = useState([]);
  const [customMap, setCustomMap] = useState({});

  // 검색어로 학생 목록 필터링
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchName = student.name && student.name.toLowerCase().includes(term);
    const matchEngName = student.engName && student.engName.toLowerCase().includes(term);
    return matchName || matchEngName;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customTextbookLevels');
      if (stored) {
        try {
          setCustomMap(JSON.parse(stored));
        } catch(e) {}
      }
    }
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
      
      setReports(data || []);
      
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
              engName: r.englishName || '',
              school: r.school || '',
              grade: r.grade || ''
            });
          } else {
            const existing = groupedMap.get(key);
            if (!existing.name || (r.koreanName && r.koreanName !== existing.name && !existing.name.match(/[가-힣]/))) {
              existing.name = r.koreanName || r.student;
            }
            if (!existing.engName && r.englishName) existing.engName = r.englishName;
            if (!existing.school && r.school) existing.school = r.school;
            if (!existing.grade && r.grade) existing.grade = r.grade;
          }
        });
      }

      // 등록된 링크(links)를 기준으로 목록 완성. 마스터 시트에 이미 저장된 이름이 있으면 우선 사용.
      const studentList = links.map(link => {
        const meta = groupedMap.get(link.url);
        return {
          url: link.url,
          status: link.status || '재원',
          name: link.name || (meta ? meta.name : '알 수 없음'),
          engName: link.engName || (meta ? meta.engName : ''),
          school: link.school || (meta ? meta.school : ''),
          grade: link.grade || (meta ? meta.grade : '')
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
      setMessage('✅ 마스터 시트에 성공적으로 등록되었습니다.');
      setUrl('');
      loadStudents(); // 목록 새로고침
    } else {
      setMessage(`❌ 오류: ${result.message}`);
    }
    
    setIsAdding(false);
  };

  const handleStatusChange = async (targetUrl, studentName, newStatus) => {
    setIsDeleting(true);
    setMessage('');

    // 상태가 휴원이나 퇴원일 경우 로컬 캐시에서 즉시 삭제하여 대시보드 깜빡임 방지
    if (newStatus !== '재원') {
      removeCachedReportsByUrl(targetUrl);
    }

    const result = await updateStudentStatusAction(targetUrl, newStatus);

    if (result.success) {
      loadStudents(); // 목록 새로고침
    } else {
      alert(`❌ 상태 변경 실패: ${result.message}`);
    }

    setIsDeleting(false);
  };

  const handleAssignLevel = (book, level) => {
    const newMap = { ...customMap, [book]: level };
    setCustomMap(newMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customTextbookLevels', JSON.stringify(newMap));
    }
    // 레벨 지정 해제 기능
    if (!level) {
      const { [book]: _, ...rest } = newMap;
      setCustomMap(rest);
      if (typeof window !== 'undefined') {
        localStorage.setItem('customTextbookLevels', JSON.stringify(rest));
      }
    }
  };

  const unmappedBooks = Array.from(new Set(reports.map(r => r.book).filter(b => !!b))).filter(b => {
    if (customMap[b]) return false;
    return !findTextbookLevel(b);
  });

  const levels = ['L1', 'L2', 'L3', 'A1', 'A2', 'A3', 'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'Adult'];

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in relative">
      {/* 전체 화면 로딩 오버레이 (상태 변경 중일 때) */}
      {isDeleting && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
          <p className="text-gray-800 font-bold text-lg">상태를 변경하는 중입니다...</p>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-6">설정</h1>
      
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-8 max-w-md border border-gray-200">
        <button 
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'students' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <User className="w-4 h-4" /> 학생 관리
        </button>
        <button 
          onClick={() => setActiveTab('books')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'books' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BookOpen className="w-4 h-4" /> 교재 레벨 매핑
          {unmappedBooks.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unmappedBooks.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'students' && (
        <>
          <p className="text-gray-500 mb-6">
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-6 h-6 text-red-500" /> 현재 등록된 학생 목록 ({students.length}명)
          </h2>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="학생 이름 검색..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
                  <th className="py-4 px-4 font-semibold w-1/5">학생 이름</th>
                  <th className="py-4 px-4 font-semibold w-1/5">학교 / 학년</th>
                  <th className="py-4 px-4 font-semibold hidden md:table-cell w-1/5">시트 링크</th>
                  <th className="py-4 px-4 font-semibold text-right w-2/5">상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${student.status !== '재원' ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="py-4 px-4 font-bold text-gray-900">
                      <div>{student.name}</div>
                      {student.engName && <div className="text-xs text-gray-500 font-normal mt-0.5">{student.engName}</div>}
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
                      <a href={student.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm truncate max-w-[150px]">
                        <ExternalLink className="w-3 h-3" /> 링크 열기
                      </a>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex rounded-md shadow-sm ml-auto" role="group">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.url, student.name, '재원')}
                          className={`px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors ${student.status === '재원' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-blue-600'}`}
                        >
                          재원
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.url, student.name, '휴원')}
                          className={`px-4 py-2 text-sm font-medium border-t border-b transition-colors ${student.status === '휴원' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-orange-600'}`}
                        >
                          휴원
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.url, student.name, '퇴원')}
                          className={`px-4 py-2 text-sm font-medium border rounded-r-lg transition-colors ${student.status === '퇴원' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-red-600'}`}
                        >
                          퇴원
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredStudents.length === 0 && students.length > 0 && (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-b-xl border-x border-b border-gray-200">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'books' && (
        <div className="glass-card p-8 mb-10 border border-gray-100 shadow-sm animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
              <AlertCircle className="w-6 h-6 text-orange-500" /> 미분류 교재 목록 ({unmappedBooks.length}개)
            </h2>
            <p className="text-sm text-gray-500">
              선생님들이 오타를 냈거나 약어로 적어서 레벨 뱃지가 매칭되지 않은 교재들입니다. 직접 레벨을 지정해 주시면 앞으로 동일한 이름이 나올 때 자동으로 매칭됩니다.
            </p>
          </div>

          {unmappedBooks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium text-lg">모든 교재가 완벽하게 매칭되었습니다!</p>
              <p className="text-sm text-gray-500 mt-1">현재 미분류된 교재가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unmappedBooks.map((book, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors">
                  <div className="flex items-start gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="font-bold text-gray-800 break-keep">{book}</p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-500 font-medium">레벨 지정:</span>
                    <select 
                      className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2 outline-none font-bold cursor-pointer hover:bg-gray-100 transition-colors"
                      value={customMap[book] || ""}
                      onChange={(e) => handleAssignLevel(book, e.target.value)}
                    >
                      <option value="">선택 안함</option>
                      {levels.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(customMap).length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> 이미 지정된 교재 목록 ({Object.keys(customMap).length}개)
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-64 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-100/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 rounded-tl-lg">교재 이름</th>
                      <th className="px-4 py-2 w-24">지정 레벨</th>
                      <th className="px-4 py-2 rounded-tr-lg w-20 text-center">해제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(customMap).map(([book, level]) => (
                      <tr key={book} className="border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{book}</td>
                        <td className="px-4 py-3 font-bold text-red-500">{level}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleAssignLevel(book, "")} className="text-gray-400 hover:text-red-500 transition-colors" title="지정 해제">
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-center mt-6">
         <a href="/" className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
           대시보드로 돌아가기
         </a>
      </div>
    </main>
  );
}
