'use client';
import { useState, useEffect } from 'react';
import { Link as LinkIcon, AlertCircle, CheckCircle, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { addLinkToMasterSheetAction } from '@/lib/actions';

export default function SettingsPage() {
  const [hasMasterUrl, setHasMasterUrl] = useState(false);
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setHasMasterUrl(true);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!url) return alert('구글 시트 링크를 입력해주세요.');
    
    setIsAdding(true);
    setMessage('');
    
    const result = await addLinkToMasterSheetAction(url);
    
    if (result.success) {
      setMessage('✅ 마스터 시트에 성공적으로 추가되었습니다! (대시보드에 즉시 반영됨)');
      setUrl('');
    } else {
      setMessage(`❌ 실패: ${result.message}`);
    }
    
    setIsAdding(false);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in">
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

      <div className="glass-card p-8 mb-10 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-red-500" /> 관리자(원장님) 초기 설정 가이드
        </h2>
        
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <div className="bg-red-50/50 p-5 rounded-xl border border-red-100">
            <h3 className="font-bold text-red-600 mb-2">1단계: 마스터 시트 생성 및 앱스 스크립트 설정</h3>
            <p className="mb-2">빈 구글 스프레드시트를 새로 만드신 후, 상단 메뉴에서 <strong>[확장 프로그램] {'>'} [Apps Script]</strong>를 클릭합니다.</p>
            <p className="mb-2">안내받으신 코드를 붙여넣고 <strong>[배포] {'>'} [새 배포] {'>'} [웹 앱]</strong>으로 설정하여 배포합니다.</p>
            <p className="text-sm text-gray-500">* 액세스 권한은 반드시 "모든 사용자(Anyone)"로 설정해야 합니다.</p>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2">2단계: Vercel 환경변수 등록</h3>
            <p className="mb-2">Vercel 대시보드의 프로젝트 <strong>Settings {'>'} Environment Variables</strong> 메뉴로 이동하여 2가지를 등록합니다.</p>
            <ul className="list-disc pl-5 font-mono text-sm bg-white p-3 rounded border border-gray-200 inline-block mb-2">
              <li>Key: <span className="font-bold text-red-500">MASTER_SHEET_URL</span> (마스터 시트 원본 주소)</li>
              <li>Key: <span className="font-bold text-blue-500">APPS_SCRIPT_URL</span> (1단계에서 발급받은 웹앱 주소)</li>
            </ul>
            <p className="text-sm text-gray-500">* 등록 후 반드시 프로젝트를 재배포(Redeploy) 해주세요.</p>
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
