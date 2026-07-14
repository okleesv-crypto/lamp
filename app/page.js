'use client';
import { useState, useEffect } from 'react';
import { fetchAllReportsAction, getMasterSheetLinksAction } from '@/lib/actions';
import { getCachedReports, setCachedReports } from '@/lib/store';
import Link from 'next/link';
import { Search, BookOpen, User, Calendar, Plus, GraduationCap, Settings, ExternalLink } from 'lucide-react';

export default function Home() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMasterSheet, setHasMasterSheet] = useState(true);

  const loadData = async () => {
    // 1. 캐시된 데이터가 있으면 먼저 바로 렌더링 (초고속 로딩)
    const cached = getCachedReports();
    if (cached && cached.length > 0) {
      processAndSetReports(cached);
      setLoading(false);
      setIsRefreshing(true);
    }

    // 2. 서버에서 마스터 시트에 등록된 링크 목록 가져오기
    const links = await getMasterSheetLinksAction();
    
    if (links && links.length > 0) {
      setHasMasterSheet(true);
      // 3. 백그라운드에서 최신 데이터 가져오기
      const data = await fetchAllReportsAction(links);
      
      // 4. 최신 데이터로 캐시 갱신 및 화면 갱신
      if (data && data.length > 0) {
        setCachedReports(data);
        processAndSetReports(data);
      }
    } else {
      // 마스터 시트가 설정되지 않았거나 링크가 없는 경우
      setHasMasterSheet(false);
      if (!cached || cached.length === 0) {
        setReports([]);
      }
    }
    
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  function processAndSetReports(data) {
    // 마스터 시트에서는 학생 정보를 따로 관리하지 않고 리포트에서 추출한 정보만 사용합니다.
    const groupedMap = new Map();
    data.forEach(r => {
      // 리포트에서 추출된 koreanName을 기준으로 그룹화합니다.
      const key = r.koreanName || r.student;
      if (!key) return; // 이름이 없는 데이터는 무시

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...r,
          reportCount: 1,
          metaKoreanName: r.koreanName || r.student,
          metaEnglishName: r.englishName || '',
          metaSchool: r.school || '',
          metaGrade: r.grade || ''
        });
      } else {
        const existing = groupedMap.get(key);
        existing.reportCount += 1;
        // 나중에 추출된 정보(더 최신일 가능성)로 메타데이터 업데이트
        if (r.school) existing.metaSchool = r.school;
        if (r.grade) existing.metaGrade = r.grade;
      }
    });

    const latestPerStudent = Array.from(groupedMap.values());
    setReports(latestPerStudent);
  }

  const filtered = reports.filter(r => 
    r.metaKoreanName.includes(search) || 
    r.metaEnglishName.toLowerCase().includes(search.toLowerCase()) ||
    r.teacher.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            학생 대시보드
          </h1>
          <p className="text-gray-500">마스터 시트에 등록된 학생 목록과 가장 최근 리포트를 확인하세요.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          {/* Master Sheet Mange Button */}
          <Link href="/settings" className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-500 py-3 px-5 rounded-xl text-sm font-medium transition-all shadow-sm">
            <Settings className="w-4 h-4" /> 마스터 시트 관리
          </Link>

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
            <Link href={`/student/${encodeURIComponent(report.metaKoreanName)}`} key={report.id + idx}>
              <div className="glass-card p-6 h-full flex flex-col group cursor-pointer animate-fade-in border border-gray-100" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl shadow-inner">
                      {report.metaKoreanName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-500 transition-colors">
                        {report.metaKoreanName} <span className="text-sm font-normal text-gray-500">{report.metaEnglishName}</span>
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <GraduationCap className="w-3 h-3" /> {report.metaSchool} {report.metaGrade}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex-1 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="badge badge-primary flex items-center gap-1 text-xs px-2 py-0.5"><Calendar className="w-3 h-3"/> {report.period || '최근 리포트'}</span>
                    <span className="badge badge-success px-2 py-0.5">총 {report.reportCount}개의 기록</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-2 mb-1 mt-2">
                    <BookOpen className="w-4 h-4 text-red-400" /> 
                    <span className="truncate">{report.book || '교재 미기재'}</span>
                  </p>
                  <p className="text-xs text-gray-500 ml-6 truncate">{report.pages}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100 mt-auto">
                  <span className="flex items-center gap-1 font-medium"><User className="w-4 h-4 text-gray-400" /> {report.teacher} 선생님</span>
                  <span className="text-red-500 font-medium group-hover:translate-x-1 transition-transform">모든 리포트 보기 →</span>
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
