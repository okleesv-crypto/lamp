'use client';
import { useState, useEffect } from 'react';
import { fetchAllReportsAction, getMasterSheetLinksAction } from '@/lib/actions';
import { getCachedReports, setCachedReports } from '@/lib/store';
import Link from 'next/link';
import { Search, BookOpen, User, Calendar, Plus, GraduationCap, Settings, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { findTextbookLevel } from '@/lib/textbooks';

export default function Home() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMasterSheet, setHasMasterSheet] = useState(true);

  const loadData = async () => {
    try {
      // 1. 캐시된 데이터가 있으면 먼저 바로 렌더링 (초고속 로딩)
      const cached = getCachedReports();
      if (cached && cached.length > 0) {
        processAndSetReports(cached);
        setLoading(false);
        setIsRefreshing(true);
      }

      // 2. 서버에서 마스터 시트에 등록된 링크 목록 가져오기
      const allLinks = await getMasterSheetLinksAction();
      const activeLinks = allLinks.filter(l => l.status === '재원');
      
      if (activeLinks && activeLinks.length > 0) {
        setHasMasterSheet(true);
        // 3. 백그라운드에서 최신 데이터 가져오기
        const data = await fetchAllReportsAction(activeLinks);
        
        // 4. 최신 데이터로 캐시 갱신 및 화면 갱신
        if (data && data.length > 0) {
          setCachedReports(data);
          processAndSetReports(data);
        }
      } else {
        // 마스터 시트가 설정되지 않았거나 활성 링크가 없는 경우
        setHasMasterSheet(false);
        if (!cached || cached.length === 0) {
          setReports([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function processAndSetReports(data) {
    // 1 URL = 1 학생이므로 URL을 기준으로 완벽하게 그룹화합니다.
    const groupedMap = new Map();
    data.forEach(r => {
      const key = r.url;
      if (!key) return; // URL이 없는 경우 무시

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...r,
          reportCount: r.isPlaceholder ? 0 : 1,
          metaKoreanName: r.koreanName || r.student,
          metaEnglishName: r.englishName || '',
          metaSchool: r.school || '',
          metaGrade: r.grade || ''
        });
      } else {
        const existing = groupedMap.get(key);
        if (!r.isPlaceholder) existing.reportCount += 1;
        
        // 처음(보통 최신) 탭의 정보를 우선시하되, 비어있을 경우에만 과거 탭의 정보로 채웁니다.
        if (!existing.metaKoreanName || (r.koreanName && r.koreanName !== existing.metaKoreanName && !existing.metaKoreanName.match(/[가-힣]/))) {
          existing.metaKoreanName = r.koreanName || r.student;
        }
        if (!existing.metaEnglishName && r.englishName) existing.metaEnglishName = r.englishName;
        if (!existing.metaSchool && r.school) existing.metaSchool = r.school;
        if (!existing.metaGrade && r.grade) existing.metaGrade = r.grade;
      }
    });

    const latestPerStudent = Array.from(groupedMap.values());
    setReports(latestPerStudent);
  }

  const filtered = reports.filter(r => 
    (r.metaKoreanName || '').includes(search) || 
    (r.metaEnglishName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.teacher || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            램프 안푸지점
          </h1>
          <p className="text-gray-500">학생 목록과 가장 최근 리포트를 확인하세요.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl transition-colors font-medium shadow-sm w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '데이터 갱신 중...' : '데이터 새로고침'}
          </button>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="학생 이름 검색..." 
              className="input-glass py-3 pr-4 pl-10 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !hasMasterSheet && reports.length === 0 ? (
        <div className="glass-card text-center py-20 flex flex-col items-center justify-center border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">등록된 학생이 없거나 마스터 시트가 설정되지 않았습니다</h2>
          <p className="text-gray-500 max-w-md mb-6">
            설정 페이지에서 마스터 구글 시트를 세팅하고, 학생들의 개별 시트 링크를 추가해주세요.
          </p>
          <Link href="/settings" className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-[0_4px_14px_rgba(239,68,68,0.3)] flex items-center gap-2">
            <Settings className="w-5 h-5" /> 마스터 시트 설정하러 가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((report, idx) => (
            <Link href={`/student/${encodeURIComponent(btoa(report.url))}`} key={report.url + idx}>
              <div className="glass-card p-6 h-full flex flex-col group cursor-pointer animate-fade-in border border-gray-100" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex flex-col items-center justify-center text-red-600 shadow-inner shrink-0 px-1">
                      <span className="text-[11px] font-bold leading-tight truncate w-full text-center">{report.metaSchool}</span>
                      <span className="text-[11px] font-bold leading-tight truncate w-full text-center">{report.metaGrade}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-500 transition-colors flex items-end gap-2 truncate">
                        <span className="truncate shrink-0">{report.metaKoreanName}</span> 
                        <span className="text-base font-normal text-gray-500 mb-0.5 truncate">{report.metaEnglishName}</span>
                      </h3>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-3xl font-bold text-xs shrink-0 flex items-center whitespace-nowrap shadow-sm">
                    총 {report.reportCount}개의 기록
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-5 mb-4 flex-1 border border-gray-100 shadow-inner mt-2">
                  <div className="flex justify-between items-center mb-5">
                    {report.type && report.type !== 'Report' ? (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-sm ${report.type === 'Weekly' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                        {report.type}
                      </span>
                    ) : (
                      <div />
                    )}
                    <span className="flex items-center gap-1.5 text-sm font-bold text-red-400 bg-red-50/80 px-3.5 py-1.5 rounded-full border border-red-100 shadow-sm"><Calendar className="w-4 h-4"/> {report.period || '최근 리포트'}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <BookOpen className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                    <div className="flex flex-col w-full overflow-hidden">
                      <h4 className="text-[1.1rem] font-bold text-gray-800 leading-snug mb-3">
                        {report.book || '교재 미기재'}
                      </h4>
                      
                      <div className="mb-2">
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
                                className={`px-2.5 py-1 text-sm font-bold rounded-lg border ${colorClass} shadow-sm inline-block group relative cursor-help transition-transform hover:scale-105`}
                                title={`매칭된 표 교재명: ${match.matchedName}`}
                              >
                                {match.level}
                              </span>
                            );
                          } else if (report.book) {
                            return (
                              <span 
                                className="px-2.5 py-1 text-sm font-bold rounded-lg border bg-gray-100 text-gray-500 border-gray-200 shadow-sm inline-block cursor-help"
                                title="정확한 매칭을 찾을 수 없습니다."
                              >
                                미분류
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      <p className="text-[13px] text-gray-500 truncate mt-1.5">{report.pages}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100 mt-auto">
                  <span className="flex items-center gap-1.5 font-bold"><User className="w-4 h-4 text-gray-400" /> {report.teacher} 선생님</span>
                  <span className="text-red-500 font-bold group-hover:translate-x-1 transition-transform">모든 리포트 보기 →</span>
                </div>
              </div>
            </Link>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 glass-card border border-gray-100">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
