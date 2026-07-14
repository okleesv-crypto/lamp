'use client';
import { useState, useEffect } from 'react';
import { Link as LinkIcon, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [hasMasterUrl, setHasMasterUrl] = useState(false);

  useEffect(() => {
    // 마스터 시트 설정 여부를 확인하는 간단한 API 호출 (또는 대시보드에서 전달받은 상태 사용 가능)
    // 지금은 UI만 표시
    setHasMasterUrl(true);
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">마스터 시트 연동 설정</h1>
      <p className="text-gray-500 mb-10">
        이제 각각의 브라우저에서 학생을 개별 등록할 필요 없이, <strong>마스터 구글 시트</strong> 한 곳에서 전체 학생 명부를 중앙 관리합니다.
      </p>

      <div className="glass-card p-8 mb-10 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" /> Vercel 마스터 시트 설정 방법
        </h2>
        
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <div className="bg-red-50/50 p-5 rounded-xl border border-red-100">
            <h3 className="font-bold text-red-600 mb-2">1단계: 마스터 시트 생성</h3>
            <p className="mb-2">빈 구글 스프레드시트를 새로 만드신 후, <strong>A열(A1부터 아래로 쭉)에 학생들의 개별 리포트 구글 시트 주소</strong>를 한 줄에 하나씩 붙여넣어 주세요.</p>
            <p className="text-sm text-gray-500">* 반드시 해당 시트는 "링크가 있는 모든 사용자가 보기 가능" 권한으로 설정되어 있어야 합니다.</p>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2">2단계: Vercel 환경변수 등록</h3>
            <p className="mb-2">Vercel 대시보드의 프로젝트 <strong>Settings {'>'} Environment Variables</strong> 메뉴로 이동합니다.</p>
            <p className="mb-2">다음과 같이 환경 변수를 추가하고 저장한 뒤, 프로젝트를 재배포(Redeploy) 해주세요.</p>
            <ul className="list-disc pl-5 font-mono text-sm bg-white p-3 rounded border border-gray-200 inline-block">
              <li>Key: <span className="font-bold text-red-500">MASTER_SHEET_URL</span></li>
              <li>Value: <span className="text-gray-500">https://docs.google.com/spreadsheets/d/.../edit</span></li>
            </ul>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2">3단계: 자동 동기화 확인</h3>
            <p>이제 마스터 시트에 링크를 추가하거나 삭제하기만 하면, 최대 5분 이내에 자동으로 모든 선생님의 화면에 최신 리포트 목록이 동기화됩니다!</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
         <a href="/" className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
           대시보드로 돌아가기
         </a>
      </div>
    </main>
  );
}
