import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { ParticipantData, WorkshopSessionConfig, BoardItem, AdminUser, StepId } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CORE_VALUE_OPTIONS } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
  onOpenFacilitator: () => void;
  isPreAuthenticated?: boolean; 
  onLoginSuccess?: () => void; 
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, onOpenFacilitator, isPreAuthenticated = false, onLoginSuccess }) => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(isPreAuthenticated);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  // --- Data State ---
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [sessions, setSessions] = useState<WorkshopSessionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [allItems, setAllItems] = useState<BoardItem[]>([]);
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'data' | 'admins'>('overview');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const hasAutoSelectedRef = useRef(false);
  
  // --- Input State (New Session) ---
  const [newCompany, setNewCompany] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newGroupCount, setNewGroupCount] = useState(4);
  const [customCoreValues, setCustomCoreValues] = useState<string[]>(CORE_VALUE_OPTIONS);
  const [newValueInput, setNewValueInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Input State (Admin) ---
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // --- Modal ---
  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  // =================================================================================================
  // INITIALIZATION & DATA FETCHING
  // =================================================================================================

  useEffect(() => {
    // Set default dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const toLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };
    setStartDate(toLocalISO(now));
    setEndDate(toLocalISO(tomorrow));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async (isPolling = false) => {
      if (!isPolling) setLoading(true);
      try {
        const dbStatus = await StorageService.checkDbConnection();
        setIsDbConnected(dbStatus);

        const [usersData, sessionsData, boardData] = await Promise.all([
            StorageService.getAllParticipants(),
            StorageService.getSessions(),
            StorageService.getAllBoardItems()
        ]);

        setParticipants(usersData);
        setSessions(prevSess => JSON.stringify(prevSess) !== JSON.stringify(sessionsData) ? sessionsData : prevSess);
        setAllItems(boardData);

        if (activeTab === 'admins') {
            const adminList = await StorageService.getAdmins();
            setAdmins(adminList);
        }

      } catch (error) {
        console.error("Failed to fetch admin data", error);
      } finally {
        if (!isPolling) setLoading(false);
      }
    };

    fetchData(false);
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId && !hasAutoSelectedRef.current) {
        setSelectedSessionId(sessions[0].id);
        hasAutoSelectedRef.current = true;
    }
  }, [sessions, selectedSessionId]);

  // =================================================================================================
  // COMPUTED DATA
  // =================================================================================================

  const activeSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  const filteredParticipants = useMemo(() => {
      if (!activeSession) return participants;
      return participants.filter(p => p.company === activeSession.company && p.batch === activeSession.batch);
  }, [participants, activeSession]);

  const filteredItems = useMemo(() => {
      if (!activeSession) return allItems;
      return allItems.filter(i => i.company === activeSession.company && i.batch === activeSession.batch);
  }, [allItems, activeSession]);

  const stats = useMemo(() => {
      const total = filteredParticipants.length;
      const groups = new Set(filteredParticipants.map(p => p.group));
      
      // Step Progress Logic
      const steps = [
          { name: 'Intro', count: filteredParticipants.filter(p => p.step0_aiProfile).length },
          { name: 'Mission', count: filteredParticipants.filter(p => p.step1_mission).length },
          { name: 'Vision', count: filteredParticipants.filter(p => p.step2_vision).length },
          { name: 'Value', count: filteredParticipants.filter(p => p.step3_votes && p.step3_votes.length > 0).length },
          { name: 'Plan', count: filteredParticipants.filter(p => p.step4_templateId).length }, 
      ];

      // Engagement (Posts per group)
      const groupActivity: Record<string, number> = {};
      groups.forEach((g) => { groupActivity[g as string] = 0; });
      filteredItems.forEach(i => {
          if (i.authorGroup) groupActivity[i.authorGroup] = (groupActivity[i.authorGroup] || 0) + 1;
      });
      const groupChartData = Object.entries(groupActivity)
          .map(([group, count]) => ({ group, count }))
          .sort((a,b) => b.count - a.count);

      // Top Keywords (from votes)
      const keywordCounts: Record<string, number> = {};
      filteredParticipants.forEach(p => {
          if (p.step3_votes) p.step3_votes.forEach(v => keywordCounts[v] = (keywordCounts[v] || 0) + 1);
      });
      const topKeywords = Object.entries(keywordCounts)
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a,b) => b.count - a.count)
          .slice(0, 10);

      return { total, steps, groupChartData, topKeywords, groupCount: groups.size };
  }, [filteredParticipants, filteredItems]);

  // =================================================================================================
  // HANDLERS
  // =================================================================================================

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2025') {
      setIsAuthenticated(true);
      setAuthError(false);
      onLoginSuccess?.(); 
    } else {
      setAuthError(true);
      setPassword(''); 
    }
  };

  const handleGoogleLogin = async () => {
    const success = await StorageService.loginAdminWithGoogle();
    if (success) {
        setIsAuthenticated(true);
        setAuthError(false);
        onLoginSuccess?.(); 
    } else {
        setModal({
            isOpen: true,
            onClose: closeModal,
            type: 'alert',
            title: 'LOGIN FAILED',
            message: '구글 로그인에 실패했습니다. 관리자로 등록된 계정인지 확인해주세요.'
        });
    }
  };

  const handleCreateSession = async () => {
      if (!newCompany.trim() || !newBatch.trim()) {
         setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'CHECK!', message: '회사명과 차수를 입력해주세요.' });
         return;
      }
      
      const startTs = startDate ? new Date(startDate).getTime() : Date.now();
      const endTs = endDate ? new Date(endDate).getTime() : Date.now() + 86400000;

      const newSession: WorkshopSessionConfig = {
        id: `session_${Date.now()}`,
        company: newCompany,
        batch: newBatch,
        totalGroups: newGroupCount,
        coreValues: customCoreValues,
        startDate: startTs,
        endDate: endTs,
        createdAt: Date.now()
      };

      await StorageService.saveSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      
      setNewCompany('');
      setNewBatch('');
      setNewGroupCount(4);
      setCustomCoreValues(CORE_VALUE_OPTIONS);
      setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'SUCCESS', message: '새로운 세션이 생성되었습니다.' });
  };

  const handleDeleteSession = (session: WorkshopSessionConfig) => {
      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'danger',
          title: 'DELETE SESSION',
          message: `'${session.company} - ${session.batch}' 세션을 삭제하시겠습니까?\n모든 참여자 데이터와 게시글이 함께 삭제됩니다.`,
          confirmText: '삭제',
          onConfirm: async () => {
              closeModal();
              await StorageService.deleteSession(session.id, session.company, session.batch);
              setSessions(prev => prev.filter(s => s.id !== session.id));
              if (selectedSessionId === session.id) setSelectedSessionId('');
          }
      });
  };

  const handleAddCoreValue = () => {
    if (newValueInput.trim() && !customCoreValues.includes(newValueInput.trim())) {
      setCustomCoreValues([...customCoreValues, newValueInput.trim()]);
      setNewValueInput('');
    }
  };

  const handleRemoveCoreValue = (val: string) => {
    setCustomCoreValues(prev => prev.filter(v => v !== val));
  };

  const handleResetCoreValues = () => {
    setCustomCoreValues(CORE_VALUE_OPTIONS);
  };

  const handleAddAdmin = async () => {
      if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
      await StorageService.addAdmin(newAdminEmail.trim());
      setAdmins(await StorageService.getAdmins());
      setNewAdminEmail('');
  };

  const handleDeleteAdmin = async (email: string) => {
      setModal({
          isOpen: true,
          onClose: closeModal,
          type: 'danger',
          title: 'DELETE ADMIN',
          message: `'${email}' 관리자를 삭제하시겠습니까?`,
          confirmText: '삭제',
          onConfirm: async () => {
              closeModal();
              await StorageService.deleteAdmin(email);
              setAdmins(prev => prev.filter(a => a.email !== email));
          }
      });
  };

  // =================================================================================================
  // RENDER
  // =================================================================================================

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] animate-fade-in">
        <Modal {...modal} />
        <Card className="max-w-md w-full p-10 border-t-[5px] border-t-black">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black text-white rounded-none flex items-center justify-center mx-auto mb-4 text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
              🔒
            </div>
            <h2 className="text-3xl font-black text-black uppercase">관리자 접속</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full px-5 py-3 border-[3px] border-black text-center font-bold" autoFocus />
            {authError && <p className="text-white bg-red-600 px-2 py-1 text-sm text-center font-bold">비밀번호 오류</p>}
            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">입장</Button>
          </form>
          <div className="mt-4"><Button variant="outline" onClick={handleGoogleLogin} className="w-full">Google Login</Button></div>
          <div className="mt-4"><Button variant="outline" onClick={onClose} className="w-full">메인으로 돌아가기</Button></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pb-20">
      <Modal {...modal} />
      
      {/* --- Admin Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-4 md:mb-0">
          <h2 className="text-3xl font-black text-black flex items-center gap-3">
            <span className="bg-black text-white text-sm font-black px-2 py-1 tracking-wider">ADMIN</span>
            퍼실리테이터 대시보드
          </h2>
          <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold text-gray-500">현재 세션:</span>
              <select 
                  value={selectedSessionId} 
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-gray-100 border-2 border-black px-2 py-1 font-bold text-sm cursor-pointer hover:bg-white"
              >
                  <option value="" disabled>세션 선택</option>
                  {sessions.map(s => {
                      const expired = s.endDate && Date.now() > s.endDate;
                      return <option key={s.id} value={s.id}>{s.company} - {s.batch} {expired ? '(종료)' : ''}</option>;
                  })}
              </select>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
           <div className={`flex items-center gap-2 px-3 py-1.5 border-[2px] border-black ${isDbConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} font-bold`}>
              <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-xs">{isDbConnected ? 'DB Connected' : 'Local Mode'}</span>
           </div>
           <Button onClick={() => window.open(window.location.pathname + '?mode=facilitator', '_blank')} className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 text-xs shadow-none">
             📺 새 창
           </Button>
           <Button onClick={onOpenFacilitator} className="bg-violet-600 hover:bg-violet-500 text-white h-9 text-xs shadow-none">
             🖥️ 화면 전환
           </Button>
           <Button variant="outline" onClick={onClose} className="text-xs px-4 py-2 h-9 bg-white shadow-none">나가기</Button>
        </div>
      </div>
      
      {/* --- Navigation Tabs --- */}
      <div className="flex space-x-0 border-[3px] border-black bg-white w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 overflow-x-auto max-w-full">
        {[
            { id: 'overview', label: '📊 상황실' },
            { id: 'sessions', label: '⚙️ 세션 설정' },
            { id: 'data', label: '📝 데이터 관리' },
            { id: 'admins', label: '👑 관리자' }
        ].map((tab) => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-black transition-all border-r-[3px] border-black last:border-r-0 whitespace-nowrap ${
                activeTab === tab.id ? 'bg-[#facc15] text-black' : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
            >
            {tab.label}
            </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
           <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="flex-1 w-full animate-fade-in-up">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && activeSession && (
            <div className="grid grid-cols-12 gap-6">
                {/* Stats Cards */}
                <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <Card className="bg-white border-black p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase">Participants</p>
                            <p className="text-4xl font-black text-black">{stats.total}</p>
                        </div>
                        <span className="text-4xl">👥</span>
                    </Card>
                    <Card className="bg-white border-black p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase">Groups</p>
                            <p className="text-4xl font-black text-black">{stats.groupCount}</p>
                        </div>
                        <span className="text-4xl">🔥</span>
                    </Card>
                    <Card className="bg-white border-black p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase">Total Ideas</p>
                            <p className="text-4xl font-black text-black">{filteredItems.length}</p>
                        </div>
                        <span className="text-4xl">💡</span>
                    </Card>
                    <Card className="bg-white border-black p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase">Progress</p>
                            <p className="text-4xl font-black text-blue-600">
                                {stats.total ? Math.round((stats.steps[4].count / stats.total) * 100) : 0}%
                            </p>
                        </div>
                        <span className="text-4xl">📈</span>
                    </Card>
                </div>

                {/* Charts Area */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card className="bg-white border-black p-6 h-96">
                        <h3 className="font-black text-black mb-6 uppercase flex items-center gap-2 border-b-2 border-black pb-2">
                            <span className="w-3 h-3 bg-blue-500"></span> 단계별 진행 현황
                        </h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={stats.steps} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={60} tick={{fontSize: 12, fontWeight: 800}} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{border: '2px solid black', fontWeight: 'bold'}} />
                                <Bar dataKey="count" barSize={30} fill="#3b82f6" radius={[0,4,4,0]}>
                                    <Cell fill="#93c5fd" />
                                    <Cell fill="#60a5fa" />
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#2563eb" />
                                    <Cell fill="#1d4ed8" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card className="bg-white border-black p-6 h-96">
                         <h3 className="font-black text-black mb-6 uppercase flex items-center gap-2 border-b-2 border-black pb-2">
                            <span className="w-3 h-3 bg-red-500"></span> 그룹별 참여 활동량
                        </h3>
                        {stats.groupChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={stats.groupChartData} margin={{ top: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="group" tick={{fontSize: 12, fontWeight: 700}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{border: '2px solid black', fontWeight: 'bold'}} />
                                    <Bar dataKey="count" fill="#f43f5e" barSize={40} radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 font-bold">아직 활동 데이터가 없습니다.</div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Keywords & Insights */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <Card className="bg-white border-black p-6 h-full min-h-[400px]">
                        <h3 className="font-black text-black mb-6 uppercase text-sm border-b-2 border-black pb-2">🔥 Top Core Values (Votes)</h3>
                        <div className="space-y-4">
                            {stats.topKeywords.length === 0 ? (
                                <p className="text-gray-400 text-xs text-center py-10">데이터 집계 중...</p>
                            ) : (
                                stats.topKeywords.map((k, i) => (
                                    <div key={k.keyword} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold border border-black ${i < 3 ? 'bg-[#facc15] text-black' : 'bg-gray-100 text-gray-500'}`}>
                                                {i+1}
                                            </span>
                                            <span className="font-bold text-sm text-black truncate max-w-[150px]">{k.keyword}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-black" style={{ width: `${Math.min(100, (k.count / stats.total) * 100)}%` }}></div>
                                            </div>
                                            <span className="font-black text-blue-600 text-sm">{k.count}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
          )}

          {/* TAB 2: SESSIONS */}
          {activeTab === 'sessions' && (
             <div className="space-y-8">
                 <Card className="bg-[#f0f9ff] border-l-[10px] border-l-sky-500 p-8 shadow-[6px_6px_0px_0px_#000]">
                    <h3 className="text-3xl font-black text-black mb-6 uppercase">Create New Session</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-black text-black mb-1 uppercase">회사명 (Company)</label>
                            <input type="text" value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="예: 삼성전자" className="w-full bg-white border-[3px] border-black px-4 py-3 font-bold text-lg text-black focus:outline-none focus:shadow-[4px_4px_0px_0px_#0284c7] placeholder-gray-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-black mb-1 uppercase">차수 / 기수 (Batch)</label>
                            <input type="text" value={newBatch} onChange={e => setNewBatch(e.target.value)} placeholder="예: 2025년 신입사원" className="w-full bg-white border-[3px] border-black px-4 py-3 font-bold text-lg text-black focus:outline-none focus:shadow-[4px_4px_0px_0px_#0284c7] placeholder-gray-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-xs font-black text-black mb-1 uppercase">조 개수</label>
                            <input type="number" min="1" max="20" value={newGroupCount} onChange={e => setNewGroupCount(Number(e.target.value))} className="w-full bg-white border-[3px] border-black px-4 py-3 font-bold text-lg text-black" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-black mb-1 uppercase">시작 일시</label>
                            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white border-[3px] border-black px-4 py-3 font-bold text-sm text-black" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-black mb-1 uppercase">종료 일시</label>
                            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white border-[3px] border-black px-4 py-3 font-bold text-sm text-black" />
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-xs font-black text-black mb-2 uppercase">핵심가치 선택지 ({customCoreValues.length}개)</label>
                        <div className="bg-white border-[3px] border-black p-4 mb-3 flex flex-wrap gap-2 min-h-[100px]">
                            {customCoreValues.map(val => (
                                <span key={val} className="bg-[#dcfce7] border-2 border-black px-3 py-1 text-sm font-bold flex items-center gap-2 text-black">
                                    {val}
                                    <button onClick={() => handleRemoveCoreValue(val)} className="text-red-500 hover:text-red-700 font-black">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newValueInput} 
                                onChange={e => setNewValueInput(e.target.value)} 
                                placeholder="핵심가치 직접 입력..." 
                                className="flex-1 bg-white border-[3px] border-black px-4 py-2 font-bold text-black"
                                onKeyPress={e => e.key === 'Enter' && handleAddCoreValue()}
                            />
                            <Button onClick={handleAddCoreValue} className="bg-[#facc15] text-black h-auto py-2 px-6 shadow-[4px_4px_0px_0px_#000]">추가</Button>
                            <Button variant="outline" onClick={handleResetCoreValues} className="h-auto py-2 px-4">초기화</Button>
                        </div>
                    </div>

                    <div className="text-left">
                        <Button onClick={handleCreateSession} className="bg-[#ef4444] text-white hover:bg-[#dc2626] py-4 px-12 text-xl shadow-[6px_6px_0px_0px_#000]">세션 생성</Button>
                    </div>
                 </Card>

                 <div className="space-y-4">
                     <h3 className="text-2xl font-black text-black uppercase border-b-2 border-black pb-2 w-fit">Active Sessions</h3>
                     {sessions.length === 0 ? (
                         <div className="text-center p-8 bg-gray-100 border-[3px] border-black border-dashed font-bold text-gray-400">
                             생성된 세션이 없습니다.
                         </div>
                     ) : (
                         sessions.map(s => {
                             const isExpired = s.endDate && Date.now() > s.endDate;
                             return (
                                 <div key={s.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] ${isExpired ? 'opacity-70 bg-gray-50' : ''}`}>
                                     <div>
                                         <h4 className="font-black text-xl mb-1 flex items-center gap-3 text-black">
                                             {s.company} 
                                             <span className="font-bold text-gray-600 text-base">({s.batch})</span>
                                             {isExpired ? (
                                                 <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 border border-red-200 font-bold">EXPIRED</span>
                                             ) : (
                                                 <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 border border-green-200 font-bold">ACTIVE</span>
                                             )}
                                         </h4>
                                         <p className="text-xs text-gray-500 font-bold">
                                             {new Date(s.createdAt).toLocaleString()} ~ {s.endDate ? new Date(s.endDate).toLocaleString() : '무기한'}
                                         </p>
                                     </div>
                                     <div className="mt-4 md:mt-0">
                                         <Button variant="danger" onClick={() => handleDeleteSession(s)} className="text-xs px-4 py-2 h-auto shadow-none border-2">DELETE</Button>
                                     </div>
                                 </div>
                             );
                         })
                     )}
                 </div>
             </div>
          )}

          {/* TAB 3: DATA LIST */}
          {activeTab === 'data' && activeSession && (
              <Card className="p-0 overflow-hidden shadow-[6px_6px_0px_0px_#000]">
                  <div className="p-6 bg-gray-50 border-b-[3px] border-black flex justify-between items-center">
                      <h3 className="font-black text-xl text-black">참여자 목록 ({filteredParticipants.length}명)</h3>
                      <Button variant="outline" className="text-xs h-8 px-3" onClick={() => alert('Excel export not implemented in demo')}>
                          📥 Excel Export
                      </Button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white border-b-2 border-black text-black uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-4 font-black">Name</th>
                                  <th className="px-6 py-4 font-black">Group</th>
                                  <th className="px-6 py-4 font-black">Progress</th>
                                  <th className="px-6 py-4 font-black">Values (Step 3)</th>
                                  <th className="px-6 py-4 font-black">Mission</th>
                              </tr>
                          </thead>
                          <tbody className="text-black">
                              {filteredParticipants.map(p => {
                                  let progress = 0;
                                  if(p.step1_mission) progress++;
                                  if(p.step2_vision) progress++;
                                  if(p.step3_votes?.length) progress++;
                                  if(p.step4_templateId) progress++;
                                  
                                  return (
                                    <tr key={p.id} className="border-b border-gray-200 hover:bg-yellow-50">
                                        <td className="px-6 py-4 font-bold flex items-center gap-2">
                                            {p.name} 
                                            {p.isCaptain && <span className="bg-yellow-400 text-black text-[10px] px-1 border border-black">CAP</span>}
                                        </td>
                                        <td className="px-6 py-4">{p.group}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 h-2 bg-gray-200 border border-black">
                                                <div className="h-full bg-blue-500" style={{ width: `${(progress/4)*100}%` }}></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium truncate max-w-[200px]">{p.step3_votes?.join(', ') || '-'}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500 truncate max-w-[200px]">{p.step1_mission || '-'}</td>
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </Card>
          )}

          {/* TAB 4: ADMINS */}
          {activeTab === 'admins' && (
              <Card className="max-w-2xl mx-auto">
                  <h3 className="text-2xl font-black mb-6 text-black">시스템 관리자 관리</h3>
                  <div className="flex gap-2 mb-6">
                      <input 
                          type="email" 
                          value={newAdminEmail} 
                          onChange={e => setNewAdminEmail(e.target.value)} 
                          placeholder="새 관리자 이메일 (Google 계정)" 
                          className="flex-1 border-[3px] border-black px-4 py-2 font-bold text-black"
                      />
                      <Button onClick={handleAddAdmin}>추가</Button>
                  </div>
                  <ul className="space-y-2">
                      {admins.map(admin => (
                          <li key={admin.email} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200">
                              <span className="font-bold text-black">{admin.email}</span>
                              <button onClick={() => handleDeleteAdmin(admin.email)} className="text-red-500 text-xs font-bold hover:underline">삭제</button>
                          </li>
                      ))}
                  </ul>
              </Card>
          )}

        </div>
      )}
    </div>
  );
};
