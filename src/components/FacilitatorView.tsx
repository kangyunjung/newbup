
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { ParticipantData, WorkshopSessionConfig, BoardItem, StepId } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { STEP_INFO } from '../constants';

interface FacilitatorViewProps {
  onClose?: () => void;
}

export const FacilitatorView: React.FC<FacilitatorViewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | StepId>('overview');
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [sessions, setSessions] = useState<WorkshopSessionConfig[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  const [boardItems, setBoardItems] = useState<Record<StepId, BoardItem[]>>({
    [StepId.INTRO]: [],
    [StepId.MISSION]: [],
    [StepId.VISION]: [],
    [StepId.VALUE]: [],
    [StepId.INTERNALIZATION]: [],
    [StepId.OUTRO]: []
  });
  
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const users = await StorageService.getAllParticipants();
    const sess = await StorageService.getSessions();
    setParticipants(users);
    setSessions(sess);

    setBoardItems({
      [StepId.INTRO]: await StorageService.getBoardItems(StepId.INTRO),
      [StepId.MISSION]: await StorageService.getBoardItems(StepId.MISSION),
      [StepId.VISION]: await StorageService.getBoardItems(StepId.VISION),
      [StepId.VALUE]: [], 
      [StepId.INTERNALIZATION]: await StorageService.getBoardItems(StepId.INTERNALIZATION),
      [StepId.OUTRO]: await StorageService.getBoardItems(StepId.OUTRO)
    });
  };

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const activeSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  const sessionParticipants = useMemo(() => {
    if (!activeSession) return [];
    return participants.filter(p => p.company === activeSession.company && p.batch === activeSession.batch);
  }, [participants, activeSession]);

  const sessionBoardItems = (stepId: StepId) => {
    if (!activeSession) return [];
    return boardItems[stepId].filter(i => i.company === activeSession.company && i.batch === activeSession.batch);
  };

  const groups = useMemo(() => {
    const groupSet = new Set(sessionParticipants.map(p => p.group));
    return Array.from(groupSet).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  }, [sessionParticipants]);

  const getItemsForView = (stepId: StepId, groupFilter: string = selectedGroup) => {
    const items = sessionBoardItems(stepId);
    if (groupFilter === 'All') return items;
    return items.filter(i => i.authorGroup === groupFilter);
  };

  const totalUsers = sessionParticipants.length || 1; 
  
  const progressData = [
    { id: StepId.INTRO, label: 'Intro', count: sessionParticipants.filter(p => p.step0_aiProfile).length },
    { id: StepId.MISSION, label: 'Mission', count: sessionParticipants.filter(p => p.step1_mission).length },
    { id: StepId.VISION, label: 'Vision', count: sessionParticipants.filter(p => p.step2_vision).length },
    { id: StepId.VALUE, label: 'Value', count: sessionParticipants.filter(p => p.step3_votes && p.step3_votes.length > 0).length },
    { id: StepId.INTERNALIZATION, label: 'Plan', count: sessionParticipants.filter(p => p.step4_templateId).length },
    { id: StepId.OUTRO, label: 'Outro', count: sessionParticipants.filter(p => p.step5_feedback).length },
  ];

  const renderGroupedGrid = (
    stepId: StepId, 
    renderItem: (item: BoardItem) => React.ReactNode,
    gridCols: string = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  ) => {
    if (selectedGroup !== 'All') {
        const items = getItemsForView(stepId, selectedGroup);
        if (items.length === 0) return <div className="text-gray-400 text-center py-20 font-bold border-2 border-dashed border-gray-300">데이터가 없습니다.</div>;
        return <div className={`grid ${gridCols} gap-6`}>{items.map(renderItem)}</div>;
    }

    return (
        <div className="space-y-12">
            {groups.map(group => {
                const groupItems = getItemsForView(stepId, group);
                if (groupItems.length === 0) return null;
                return (
                    <div key={group} className="animate-fade-in-up">
                        <h4 className="text-2xl font-black text-black mb-4 flex items-center gap-2 border-b-[3px] border-black pb-2 w-fit pr-8">
                            <span className="bg-black text-white text-sm px-2 py-1">{group}</span>
                            <span className="text-gray-500 text-sm font-bold">({groupItems.length} items)</span>
                        </h4>
                        <div className={`grid ${gridCols} gap-6`}>
                            {groupItems.map(renderItem)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const renderContent = () => {
    if (!activeSession) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-2xl font-black mb-4">선택된 세션이 없습니다.</p>
                <p>상단에서 진행할 교육 과정을 선택해주세요.</p>
            </div>
        );
    }
    
    if (activeTab === 'overview') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in h-full overflow-y-auto pb-10 custom-scrollbar">
             <Card className="col-span-full bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] flex justify-between items-center p-8">
               <div>
                 <h3 className="text-5xl font-black text-black mb-2 uppercase">{activeSession.company} Workshop</h3>
                 <div className="flex items-center gap-3">
                   <p className="text-black font-bold text-xl bg-gray-200 px-2">{activeSession.batch}</p>
                   {selectedGroup !== 'All' && (
                     <span className="bg-[#2563eb] text-white text-sm font-black px-3 py-1 border-2 border-black">
                       Viewing: {selectedGroup}
                     </span>
                   )}
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-sm text-black font-black uppercase tracking-widest mb-1">Total Participants</p>
                 <p className="text-8xl font-black text-black">{sessionParticipants.length}</p>
               </div>
             </Card>

             {progressData.map((step) => {
               const percent = totalUsers > 0 ? Math.round((step.count / totalUsers) * 100) : 0;
               const info = STEP_INFO[step.id];
               return (
                 <Card key={step.id} className="bg-white border-[3px] border-black p-8 relative overflow-hidden group shadow-[6px_6px_0px_0px_#000]">
                   <div className="flex justify-between items-end mb-6 relative z-10">
                     <div>
                       <span className="text-xs font-black text-white bg-black px-2 py-1 mb-3 inline-block">Step {step.id}</span>
                       <h4 className="text-2xl font-black text-black uppercase">{info.title.split('.')[1]}</h4>
                     </div>
                     <span className="text-5xl font-black text-black">{percent}%</span>
                   </div>
                   
                   <div className="w-full bg-gray-200 border-2 border-black h-4 overflow-hidden relative z-10">
                     <div 
                       className="h-full bg-[#2563eb] transition-all duration-1000 ease-out"
                       style={{ width: `${percent}%` }}
                     ></div>
                   </div>
                   <div className="mt-3 text-right text-base text-black relative z-10 font-bold">
                     <span className="text-[#2563eb]">{step.count}명</span> 완료 / {totalUsers}명
                   </div>
                 </Card>
               );
             })}
          </div>
        );
    }
    
    if (activeTab === StepId.INTRO) {
        return (
          <div className="animate-fade-in h-full flex flex-col">
            <h3 className="text-3xl font-black text-black mb-8 flex items-center gap-3 uppercase">
              👤 AI Profiles Gallery
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {renderGroupedGrid(StepId.INTRO, (item) => {
                    let extra: any = {};
                    try { extra = item.extraInfo ? JSON.parse(item.extraInfo) : {}; } catch(e){}
                    return (
                        <div key={item.id} className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] relative group">
                            <div className="aspect-square relative overflow-hidden border-b-[3px] border-black">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">👤</div>}
                            </div>
                            <div className="p-3 bg-white">
                                <p className="text-black font-black truncate text-lg">{item.authorName}</p>
                                <p className="text-xs text-gray-500 font-bold truncate">{extra.dept || '소속 미입력'}</p>
                            </div>
                        </div>
                    );
                }, "grid-cols-2 md:grid-cols-4 lg:grid-cols-6")}
            </div>
          </div>
        );
    }

    if (activeTab === StepId.MISSION || activeTab === StepId.VISION) {
         return (
          <div className="animate-fade-in h-full flex flex-col">
            <h3 className="text-4xl font-black text-black mb-8 flex items-center gap-4 uppercase">
               {activeTab === StepId.MISSION ? 'Mission' : 'Vision'} Board
            </h3>
            <div className="overflow-y-auto custom-scrollbar pb-10 flex-1">
                {renderGroupedGrid(activeTab, (item) => (
                    <div key={item.id} className="bg-white p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col relative group hover:bg-yellow-50 transition-all">
                         <p className="text-2xl text-black font-black leading-relaxed break-keep">"{item.content}"</p>
                         <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center text-sm text-black">
                             <span className="font-bold">{item.authorName}</span>
                         </div>
                    </div>
                ))}
            </div>
          </div>
        );
    }
    
    return <div className="text-center py-20 font-black text-2xl text-gray-400">Content loading...</div>;
  };

  const navItems = [
    { id: 'overview', label: '📊 Overview' },
    { id: StepId.INTRO, label: '0. Warm-up' },
    { id: StepId.MISSION, label: '1. Mission' },
    { id: StepId.VISION, label: '2. Vision' },
    { id: StepId.VALUE, label: '3. Value' },
    { id: StepId.INTERNALIZATION, label: '4. Plan' },
    { id: StepId.OUTRO, label: '5. Outro' },
  ];

  return (
    <div className="fixed inset-0 bg-[#fffdf5] text-black z-[100] flex flex-col">
      <Modal {...modal} />
      <div className="border-b-[3px] border-black flex flex-col bg-white z-50">
        <div className="h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#2563eb] border-[3px] border-black flex items-center justify-center font-bold text-xl text-white shadow-[2px_2px_0px_0px_#000]">B</div>
                <span className="font-black text-2xl tracking-tight text-black uppercase">Build Up <span className="text-gray-500 text-lg font-bold">| Facilitator Mode</span></span>
            </div>
            {activeSession && (
                 <div className="ml-8 flex items-center gap-2 animate-fade-in">
                    <span className="text-xs font-black bg-black text-white px-2 py-1 uppercase">CURRENT SESSION</span>
                    <span className="text-lg font-black text-black">{activeSession.company} - {activeSession.batch}</span>
                </div>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-black px-4 font-bold">EXIT</Button>
          )}
        </div>

        <div className="flex items-center justify-between px-8 py-3 bg-gray-50 border-t-[3px] border-black overflow-x-auto">
          <div className="flex gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-4 py-1.5 text-sm font-black transition-all whitespace-nowrap border-2 border-black ${activeTab === item.id ? 'bg-[#facc15] text-black shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-black uppercase mr-2">Filter Group:</span>
            <button onClick={() => setSelectedGroup('All')} className={`px-3 py-1 text-xs font-bold border-2 border-black transition-all ${selectedGroup === 'All' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>ALL</button>
            {groups.map(group => (
              <button key={group} onClick={() => setSelectedGroup(group)} className={`px-3 py-1 text-xs font-bold border-2 border-black transition-all ${selectedGroup === group ? 'bg-[#2563eb] text-white' : 'bg-white text-black hover:bg-gray-100'}`}>{group}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none"></div>
        {renderContent()}
      </div>
    </div>
  );
};
