'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAllReportsAction, getMasterSheetLinksAction } from '@/lib/actions';
import { getCachedReports, setCachedReports } from '@/lib/store';
import { ArrowLeft, BookOpen, MessageCircle, Calendar, User, Building, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { findTextbookLevel } from '@/lib/textbooks';

export default function StudentPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // URL에서 base64 인코딩된 주소를 복호화합니다.
  const targetUrl = typeof window !== 'undefined' ? atob(decodeURIComponent(id)) : '';
  
  const [reports, setReports] = useState([]);
  const [studentMeta, setStudentMeta] = useState({ koreanName: '로딩중...', englishName: '', school: '', grade: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progress');
  const [expandedBooks, setExpandedBooks] = useState({});

  useEffect(() => {
    if (!targetUrl) return;

    async function load() {
      const links = await getMasterSheetLinksAction();
      const currentLink = links.find(l => l.url === targetUrl);

      // 1. 캐시된 데이터로 즉시 렌더링
      const cached = getCachedReports();
      if (cached) {
        processAndSet(cached, currentLink);
        setLoading(false);
      }

      // 2. 백그라운드 데이터 패치
      const data = await fetchAllReportsAction(links);
      if (data && data.length > 0) {
        setCachedReports(data);
        processAndSet(data, currentLink);
      } else {
        // 데이터가 비어있어도 링크 메타데이터는 업데이트
        processAndSet([], currentLink);
      }
      setLoading(false);
    }
    load();
  }, [targetUrl]);

  function processAndSet(data, currentLink) {
    const studentReports = data ? data.filter(r => r.url === targetUrl) : [];
    setReports(studentReports);
    
    // 학생 메타 데이터 추출
    if (studentReports.length > 0) {
      let latestKor = '';
      let latestEng = '';
      let latestSchool = '';
      let latestGrade = '';
      
      studentReports.forEach(r => {
        if (!latestKor || (r.koreanName && r.koreanName !== latestKor && !latestKor.match(/[가-힣]/))) {
          latestKor = r.koreanName || r.student;
        }
        if (!latestEng && r.englishName) latestEng = r.englishName;
        if (!latestSchool && r.school) latestSchool = r.school;
        if (!latestGrade && r.grade) latestGrade = r.grade;
      });
      
      setStudentMeta({
        koreanName: currentLink?.name || latestKor || '알 수 없음',
        englishName: currentLink?.engName || latestEng,
        school: currentLink?.school || latestSchool,
        grade: currentLink?.grade || latestGrade
      });
    } else {
      setStudentMeta(prev => ({
        ...prev,
        koreanName: currentLink?.name || '등록된 리포트 없음',
        englishName: currentLink?.engName || '',
        school: currentLink?.school || '',
        grade: currentLink?.grade || ''
      }));
    }
  }

  const toggleBook = (idx) => {
    setExpandedBooks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-10 animate-fade-in">
      <button 
        onClick={() => router.push('/')} 
        className="flex items-center gap-2 text-gray-500 hover:text-red-500 font-medium transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> 뒤로 가기
      </button>

      <div className="glass-card p-6 md:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6 border border-gray-200">
        <div className="w-20 h-20 rounded-full bg-red-100 flex flex-col items-center justify-center text-red-500 shadow-inner border-4 border-white shrink-0 p-2 overflow-hidden">
          <span className="text-sm font-bold leading-tight text-center">{studentMeta.school?.trim()}</span>
          <span className="text-sm font-bold leading-tight text-center">{studentMeta.grade?.trim()}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-end gap-3">
            {studentMeta.koreanName} 
            {studentMeta.englishName && <span className="text-xl text-gray-400 font-normal">{studentMeta.englishName}</span>}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full font-medium">총 {reports.length}개의 리포트</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {!loading && reports.length > 0 && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-10 max-w-md border border-gray-200">
          <button 
            onClick={() => setActiveTab('progress')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'progress' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BookOpen className="w-4 h-4" /> 교재 및 진도
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'report' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MessageCircle className="w-4 h-4" /> 리포트 (평가)
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card text-center py-20 text-gray-500 border border-gray-100">
          이 학생의 리포트 기록이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:gap-5">
          {reports.map((report, idx) => (
            <div key={idx} className="glass-card p-4 md:p-5 border border-gray-100 shadow-sm animate-fade-in flex flex-col transition-all hover:border-red-200" style={{ animationDelay: `${idx * 0.03}s` }}>
              {/* One Line Header */}
              <div 
                className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 cursor-pointer"
                onClick={() => toggleBook(idx)}
              >
                {/* Date */}
                <div className="flex items-center gap-2 text-gray-800 font-bold min-w-[90px]">
                  {report.type && report.type !== 'Report' && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${report.type === 'Weekly' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                      {report.type}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-red-500 shrink-0" /> {report.period}
                  </span>
                </div>
                {/* Teacher */}
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {report.teacher}
                </div>
                {/* Textbook */}
                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium flex-1 w-full">
                  <BookOpen className="w-4 h-4 text-red-400 shrink-0" /> 
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{report.book || '교재 미기재'}</span>
                    {(() => {
                      const match = findTextbookLevel(report.book);
                      if (match) {
                        const colors = {
                          L1: 'bg-green-100 text-green-700 border-green-200',
                          L2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                          L3: 'bg-teal-100 text-teal-700 border-teal-200',
                          A1: 'bg-blue-100 text-blue-700 border-blue-200',
                          A2: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                          A3: 'bg-violet-100 text-violet-700 border-violet-200',
                          M1: 'bg-purple-100 text-purple-700 border-purple-200',
                          M2: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
                          M3: 'bg-pink-100 text-pink-700 border-pink-200',
                          P1: 'bg-orange-100 text-orange-700 border-orange-200',
                          P2: 'bg-amber-100 text-amber-700 border-amber-200',
                          P3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                          Adult: 'bg-gray-100 text-gray-700 border-gray-200'
                        };
                        const colorClass = colors[match.level] || 'bg-gray-100 text-gray-700 border-gray-200';
                        return (
                          <span 
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${colorClass} shadow-sm group relative cursor-help`}
                            title={`매칭된 표 교재명: ${match.matchedName}`}
                          >
                            {match.level}
                          </span>
                        );
                      } else if (report.book) {
                        return (
                          <span 
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-md border bg-gray-100 text-gray-500 border-gray-200 shadow-sm cursor-help"
                            title="정확한 매칭을 찾을 수 없습니다."
                          >
                            미분류
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                
                {/* Toggle Icon */}
                <div className="hidden md:flex ml-auto items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-400 shrink-0 transition-colors">
                  {expandedBooks[idx] ? <ChevronUp className="w-5 h-5 text-red-500" /> : <ChevronDown className="w-5 h-5 group-hover:text-red-500" />}
                </div>
              </div>

              {/* Mobile Toggle Icon (visible only on small screens below the text) */}
              <div className="md:hidden flex justify-center w-full mt-2 text-gray-400" onClick={() => toggleBook(idx)}>
                  {expandedBooks[idx] ? <ChevronUp className="w-5 h-5 text-red-500" /> : <ChevronDown className="w-5 h-5" />}
              </div>

              {/* Expanded Content */}
              {expandedBooks[idx] && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  {activeTab === 'progress' && (
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner border-l-4 border-l-red-400">
                      <span className="block text-gray-500 text-xs font-semibold mb-2 uppercase">상세 진도 내역 (페이지)</span>
                      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                        {report.pages || '진도 상세 내역이 없습니다.'}
                      </p>
                    </div>
                  )}

                  {activeTab === 'report' && (
                    <div className="bg-red-50/30 p-4 rounded-xl border border-red-100 shadow-inner">
                      <span className="block text-red-500 text-xs font-semibold mb-2 uppercase">종합 평가 코멘트</span>
                      <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                        {report.evaluation || '평가 내용이 작성되지 않았습니다.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
