'use client';

const STORAGE_KEY = 'LAMP_STUDENT_LINKS';
const CACHE_KEY = 'LAMP_REPORTS_CACHE';

export function getStudentLinks() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load links from local storage', e);
    return [];
  }
}

export function saveStudentLink(koreanName, englishName, school, grade, url) {
  if (typeof window === 'undefined') return false;
  try {
    const links = getStudentLinks();
    const newLink = { 
      id: Date.now().toString(), 
      koreanName, 
      englishName, 
      school, 
      grade, 
      url 
    };
    links.push(newLink);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    return true;
  } catch (e) {
    console.error('Failed to save link', e);
    return false;
  }
}

export function removeStudentLink(id) {
  if (typeof window === 'undefined') return false;
  try {
    let links = getStudentLinks();
    links = links.filter(link => link.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    return true;
  } catch (e) {
    console.error('Failed to remove link', e);
    return false;
  }
}

// === 리포트 캐싱 유틸리티 (Stale-While-Revalidate) ===

export function getCachedReports() {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    // 캐시 유효기간 (예: 12시간) - 원한다면 로직 추가 가능
    // 현재는 SWR 패턴을 쓸 것이므로 항상 반환
    return parsed.reports || null;
  } catch (e) {
    return null;
  }
}

export function setCachedReports(reports) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      reports
    }));
  } catch (e) {
    // 용량 초과 등의 에러 무시
  }
}

export function removeCachedReportsByUrl(url) {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return;
    
    const parsed = JSON.parse(data);
    if (parsed && parsed.reports) {
      parsed.reports = parsed.reports.filter(r => r.url !== url);
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
  }
}
