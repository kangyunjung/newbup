
import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Modal, ModalProps } from './Modal';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { VoteResult, WorkshopData, BoardItem, StepId, UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface Step5Props {
  onReset: () => void;
  user: UserProfile;
}

const POSTER_STYLES = [
    { id: 'blockbuster', name: 'Movie poster', emoji: '🎬', desc: '웅장한 영화 포스터' },
    { id: '3d_animation', name: '3d Animation', emoji: '🧸', desc: '디즈니/픽사 3D 스타일' },
    { id: 'isometric', name: 'Isometric', emoji: '🏢', desc: '3D 미니어처 세상' },
    { id: 'pixel_art', name: '3d Pixel art', emoji: '👾', desc: '레트로 복셀 아트' },
    { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🌃', desc: '네온 미래 도시' },
    { id: 'space', name: 'Space odyssey', emoji: '🚀', desc: '우주 탐험 스타일' },
    { id: 'lego', name: 'Brick world', emoji: '🧱', desc: '블록 토이 스타일' },
    { id: 'watercolor', name: 'Ghibli style', emoji: '🎨', desc: '감성 수채화/지브리' },
    { id: 'oil_painting', name: 'Masterpiece', emoji: '🖼️', desc: '클래식 명화 스타일' },
    { id: 'paper_cutout', name: 'Paper craft', emoji: '✂️', desc: '종이 공예 아트' },
];

export const Step5_Outro: React.FC<Step5Props> = ({ onReset, user }) => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [myData, setMyData] = useState<WorkshopData>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackList, setFeedbackList] = useState<BoardItem[]>([]);
  
  // History Data
  const [introItems, setIntroItems] = useState<BoardItem[]>([]);
  const [actionCount, setActionCount] = useState(0);

  // Final Image State
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('blockbuster');
  
  // Lightbox State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalProps>({ isOpen: false, onClose: () => {}, message: '' });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const isCaptain = user.isCaptain;

  useEffect(() => {
    const init = async () => {
      setResults(await StorageService.getVoteResults());
      const data = await StorageService.getWorkshopData();
      setMyData(data);
      if (data.step5_finalImage) setFinalImage(data.step5_finalImage);
      
      loadHistory();
      loadFeedbacks();
    };
    init();
    const interval = setInterval(() => {
        // Poll for data updates (especially for members waiting for captain)
        init(); 
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
      const intros = await StorageService.getBoardItems(StepId.INTRO);
      const actionItems = await StorageService.getBoardItems(StepId.INTERNALIZATION);
      
      const groupIntros = intros.filter(i => i.authorGroup === user.group);
      setIntroItems(groupIntros);
      setActionCount(actionItems.filter(i => i.authorGroup === user.group).length);
  };

  const loadFeedbacks = async () => {
    const items = await StorageService.getBoardItems(StepId.OUTRO);
    const groupItems = items.filter(i => i.authorGroup === user.group);
    setFeedbackList(groupItems);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    const newItem: BoardItem = {
      id: Date.now().toString() + "_" + user.name,
      stepId: StepId.OUTRO,
      authorName: user.name,
      authorGroup: user.group,
      company: user.company,
      batch: user.batch,
      content: feedback,
      votes: 0,
      timestamp: Date.now()
    };
    await StorageService.addBoardItem(newItem);
    await StorageService.saveWorkshopData({ step5_feedback: feedback });
    setFeedback('');
    await loadFeedbacks();
  };

  const handleGenerateFinalImage = async () => {
      if (!myData.step1_mission || !myData.step2_vision) {
          setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Missing data', message: '미션과 비전 데이터가 필요합니다.' });
          return;
      }
      setIsGenerating(true);
      try {
          // Nano Banana Pro (gemini-3-pro-image-preview)
          const base64 = await GeminiService.generateFinalTeamImage(
              user.group,
              myData.step1_mission,
              myData.step2_vision,
              myData.step3_votes || [],
              selectedStyle,
              Math.max(1, introItems.length) // Pass team member count
          );

          if (base64) {
              setFinalImage(base64);
              await StorageService.saveWorkshopData({ step5_finalImage: base64 });
          } else {
              setModal({ isOpen: true, onClose: closeModal, type: 'alert', title: 'Error', message: '이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' });
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  // Waiting Screen for Members
  if (!isCaptain && !finalImage) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in space-y-8">
              <div className="w-24 h-24 bg-white border-[4px] border-black rounded-full flex items-center justify-center shadow-[8px_8px_0px_0px_#000] animate-bounce">
                  <span className="text-4xl">🚧</span>
              </div>
              <div>
                  <h2 className="text-4xl font-black text-black mb-4 uppercase">Waiting for captain...</h2>
                  <p className="text-xl font-bold text-gray-600 bg-white border-2 border-black inline-block px-6 py-3">
                      조장이 '우리의 여정(Masterpiece)'을 생성하고 있습니다.<br/>
                      잠시만 기다려주세요!
                  </p>
              </div>
              <div className="flex gap-2 mt-8">
                  <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-black rounded-full animate-pulse delay-100"></div>
                  <div className="w-3 h-3 bg-black rounded-full animate-pulse delay-200"></div>
              </div>
          </div>
      );
  }

  // Styles
  const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#34d399', '#2dd4bf'];

  return (
    <div className="space-y-12 w-full max-w-7xl mx-auto pb-20">
      <Modal {...modal} />
      
      {/* Lightbox Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
              <img src={previewImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain border-[4px] border-white shadow-2xl" />
              <button className="absolute top-6 right-6 text-white text-4xl font-black hover:text-gray-300">×</button>
          </div>
      )}
      
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in-up">
        <span className="inline-block py-2 px-6 bg-black text-white text-sm font-black mb-6 shadow-[6px_6px_0px_0px_#2563eb] border-2 border-white">
           🎉 Workshop Completed
        </span>
        <h2 className="text-6xl md:text-7xl font-black mb-4 text-black tracking-tighter leading-none">
          Step 5. 마무리
        </h2>
        <p className="text-xl md:text-2xl text-black font-bold bg-white inline-block px-4 py-1 border-2 border-black shadow-sm">
           우리가 함께 걸어온 길, 그리고 앞으로 나아갈 미래
        </p>
      </div>

      {/* 1. Journey Timeline (Story of Steps) */}
      <div className="relative animate-fade-in-up">
         <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-black -translate-x-1/2 hidden md:block z-0"></div>
         
         <div className="space-y-12 relative z-10">
            {/* Step 0: Team Formation */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
               <div className="w-full md:w-1/2 flex justify-end">
                   <Card className="w-full md:max-w-md bg-white border-black p-6 relative group-hover:-translate-y-1 transition-transform">
                       <div className="absolute top-4 right-4 text-4xl grayscale opacity-20 group-hover:opacity-100 group-hover:grayscale-0 transition-all">🦸</div>
                       <h4 className="text-xl font-black text-black uppercase mb-2">Chapter 1. The assembly</h4>
                       <p className="text-gray-600 font-bold text-sm mb-4 leading-relaxed">
                           서로 다른 개성을 가진 <strong>{introItems.length}명의 영웅들</strong>이<br/> 하나의 팀으로 모였습니다.
                       </p>
                       
                       {/* Team Profile Gallery (Mini) */}
                       <div className="grid grid-cols-4 gap-2 mt-4">
                           {introItems.slice(0, 4).map((item, i) => (
                               <div key={i} className="aspect-square bg-gray-100 border border-black overflow-hidden">
                                   {item.imageUrl ? (
                                       <img src={item.imageUrl} alt={item.authorName} className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-white">?</div>
                                   )}
                               </div>
                           ))}
                       </div>
                   </Card>
               </div>
               <div className="w-12 h-12 rounded-full bg-black border-4 border-white shadow-lg flex items-center justify-center text-white font-black z-10 shrink-0">0</div>
               <div className="w-full md:w-1/2 text-left pl-4 hidden md:block select-none">
                   <span className="text-6xl font-black text-gray-300 uppercase">Team<br/>Assemble</span>
               </div>
            </div>

            {/* Step 1: Mission */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 group">
               <div className="w-full md:w-1/2 flex justify-start">
                   <Card className="w-full md:max-w-md bg-[#faf5ff] border-black p-6 relative border-l-[8px] border-l-purple-500 group-hover:-translate-y-1 transition-transform">
                       <h4 className="text-sm font-black text-purple-600 uppercase mb-1">Chapter 2. Our north star</h4>
                       <p className="text-2xl font-black text-black leading-snug break-keep">
                           "{myData.step1_mission || 'Mission undefined'}"
                       </p>
                       <p className="text-xs text-purple-800 font-bold mt-3">
                           우리가 세상에 존재하는 이유를 정의했습니다.
                       </p>
                   </Card>
               </div>
               <div className="w-12 h-12 rounded-full bg-purple-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-black z-10 shrink-0">1</div>
               <div className="w-full md:w-1/2 text-right pr-4 hidden md:block select-none">
                   <span className="text-6xl font-black text-purple-200 uppercase">Mission<br/>Defined</span>
               </div>
            </div>

            {/* Step 2: Vision */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
               <div className="w-full md:w-1/2 flex justify-end">
                   <Card className="w-full md:max-w-md bg-[#fff1f2] border-black p-6 relative border-r-[8px] border-r-pink-500 text-right group-hover:-translate-y-1 transition-transform">
                       <h4 className="text-sm font-black text-pink-600 uppercase mb-1">Chapter 3. Dreaming the future</h4>
                       <p className="text-2xl font-black text-black leading-snug break-keep">
                           "{myData.step2_vision || 'Vision undefined'}"
                       </p>
                       <p className="text-xs text-pink-800 font-bold mt-3">
                           3년 후, 우리가 달성할 가슴 뛰는 미래입니다.
                       </p>
                   </Card>
               </div>
               <div className="w-12 h-12 rounded-full bg-pink-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-black z-10 shrink-0">2</div>
               <div className="w-full md:w-1/2 text-left pl-4 hidden md:block select-none">
                   <span className="text-6xl font-black text-pink-200 uppercase">Vision<br/>Creator</span>
               </div>
            </div>

            {/* Step 3: Values (Chart) */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 group">
               <div className="w-full md:w-1/2 flex justify-start">
                   <Card className="w-full md:max-w-md bg-white border-black p-0 overflow-hidden group-hover:-translate-y-1 transition-transform">
                       <div className="bg-black text-white p-3 font-black text-center uppercase text-sm">Chapter 4. Our DNA (Core values)</div>
                       <div className="h-40 w-full p-4 bg-white">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={results.slice(0, 3)} layout="vertical" margin={{ left: 10, right: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="keyword" width={100} tick={{fontSize: 12, fontWeight: 700}} interval={0} />
                                    <Bar dataKey="count" barSize={20} fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                       </div>
                   </Card>
               </div>
               <div className="w-12 h-12 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-black z-10 shrink-0">3</div>
               <div className="w-full md:w-1/2 text-right pr-4 hidden md:block select-none">
                   <span className="text-6xl font-black text-emerald-200 uppercase">Core<br/>Values</span>
               </div>
            </div>

            {/* Step 4: Action Plans */}
            <div className="flex flex-col md:flex-row items-center gap-8 group">
               <div className="w-full md:w-1/2 flex justify-end">
                   <Card className="w-full md:max-w-md bg-[#fffbeb] border-black p-6 group-hover:-translate-y-1 transition-transform">
                       <h4 className="text-xl font-black text-black uppercase mb-2">Chapter 5. The blueprint</h4>
                       <p className="text-gray-600 font-bold text-sm mb-4">
                           우리의 약속을 지키기 위한 <strong>{actionCount}개의 행동 강령</strong>을 수립했습니다.
                       </p>
                       <div className="flex gap-2 justify-end">
                           <span className="bg-amber-100 text-amber-800 border-2 border-black px-3 py-1 font-black text-xs shadow-sm">
                               Ready for action!
                           </span>
                       </div>
                   </Card>
               </div>
               <div className="w-12 h-12 rounded-full bg-amber-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-black z-10 shrink-0">4</div>
               <div className="w-full md:w-1/2 text-left pl-4 hidden md:block select-none">
                   <span className="text-6xl font-black text-amber-200 uppercase">Action<br/>Plan</span>
               </div>
            </div>
         </div>
      </div>

      {/* 2. Final Poster Generation (The Masterpiece) */}
      <div className="mt-32 relative">
         {/* Decorative Background */}
         <div className="absolute inset-0 bg-black skew-y-3 scale-110 z-0 border-y-4 border-blue-600"></div>

         <Card className="bg-[#1a1a1a] border-[4px] border-white p-1 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 transform -rotate-1 mx-auto max-w-5xl">
            <div className="bg-[#1a1a1a] p-8 md:p-12 text-center border-2 border-white/20">
                <h3 className="text-4xl md:text-6xl font-black mb-6 uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-md">
                    The Masterpiece
                </h3>
                <p className="text-gray-300 text-lg font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                    우리의 미션, 비전, 핵심가치가 하나로 융합된 <strong>최종 팀 포스터</strong>를 생성합니다.<br/>
                    AI가 우리 팀만의 고유한 정체성을 시각화해드립니다.
                </p>

                {/* Style Selector: Always visible for Captain */}
                {isCaptain && (
                    <div className="mb-10 text-left animate-fade-in bg-black/50 p-6 border-2 border-white/30 rounded-lg">
                        <p className="text-[#facc15] text-sm font-black uppercase mb-4 text-center tracking-widest">
                            {finalImage ? '🖌️ Want a different style? Select & regenerate' : '👇 Choose your art style'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {POSTER_STYLES.map(style => (
                                <button 
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    className={`p-3 border-2 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${
                                        selectedStyle === style.id 
                                        ? 'bg-white border-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10' 
                                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                                    }`}
                                >
                                    <span className="text-3xl filter drop-shadow-md z-10">{style.emoji}</span>
                                    <div className="text-center z-10">
                                        <span className="block text-xs font-black uppercase">{style.name}</span>
                                    </div>
                                    {selectedStyle === style.id && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-200 to-white opacity-20"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {finalImage ? (
                    <div className="animate-fade-in space-y-8">
                        <div className="relative max-w-4xl mx-auto border-[8px] border-white shadow-[0_0_50px_rgba(37,99,235,0.5)] group overflow-hidden cursor-pointer bg-black" onClick={() => setPreviewImage(finalImage)}>
                            <img src={finalImage} alt="Final team poster" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <span className="text-white font-black text-2xl uppercase tracking-widest border-4 border-white px-6 py-3">Click to expand</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            <a href={finalImage} download="Team_Masterpiece.png" className="bg-[#2563eb] text-white border-2 border-white px-8 py-4 font-black uppercase hover:bg-blue-600 transition-colors shadow-[4px_4px_0px_0px_#fff]">
                                💾 Download image
                            </a>
                            {isCaptain && (
                                <Button 
                                    onClick={handleGenerateFinalImage} 
                                    loading={isGenerating}
                                    className="bg-transparent border-2 border-white text-white hover:bg-white/10 h-auto py-4 px-8 text-base shadow-none"
                                >
                                    {isGenerating ? '🎨 Regenerating...' : '🔄 Regenerate with new style'}
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-4">Generated by Gemini 3.0 Pro Vision</p>
                    </div>
                ) : (
                    <div className="py-6">
                        <div className="flex flex-col items-center justify-center">
                            {isCaptain ? (
                                <Button 
                                    onClick={handleGenerateFinalImage} 
                                    loading={isGenerating}
                                    className="text-xl md:text-3xl h-24 px-16 bg-[#facc15] text-black hover:bg-[#eab308] border-4 border-white shadow-[0_0_40px_rgba(250,204,21,0.6)] font-black uppercase tracking-tighter transform hover:scale-105 transition-all w-full md:w-auto"
                                >
                                    {isGenerating ? '🎨 Painting...' : '✨ Create masterpiece'}
                                </Button>
                            ) : (
                                <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
                                    <p className="text-gray-400 font-bold text-lg">Waiting for captain to create the masterpiece...</p>
                                </div>
                            )}
                            
                            <p className="mt-8 text-sm text-gray-400 font-medium">
                                * 고해상도(2K) 이미지가 생성됩니다. 약 10-15초 소요됩니다.<br/>
                                * 선택한 스타일로 우리 조원 {Math.max(1, introItems.length)}명이 모두 등장하는 포스터를 그립니다.
                            </p>
                        </div>
                    </div>
                )}
            </div>
         </Card>
      </div>

      {/* 3. Team Member Gallery (New Section) */}
      {introItems.length > 0 && (
          <div className="mt-20">
              <div className="flex items-center gap-4 mb-8">
                  <div className="h-[2px] bg-black flex-1"></div>
                  <h3 className="text-3xl font-black text-black uppercase text-center whitespace-nowrap">
                      Team gallery
                  </h3>
                  <div className="h-[2px] bg-black flex-1"></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {introItems.map((item) => (
                      <div 
                          key={item.id} 
                          className="bg-white border-[3px] border-black p-2 shadow-[4px_4px_0px_0px_#000] cursor-pointer hover:-translate-y-1 transition-transform group"
                          onClick={() => item.imageUrl && setPreviewImage(item.imageUrl)}
                      >
                          <div className="aspect-square bg-gray-100 border-2 border-black overflow-hidden relative">
                              {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.authorName} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                              )}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-2xl font-bold">🔍</span>
                              </div>
                          </div>
                          <div className="mt-2 text-center">
                              <p className="text-black font-black text-sm truncate">{item.authorName}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 4. Feedback Section */}
      <div className="bg-[#f3f4f6] border-[3px] border-black p-8 md:p-12 shadow-[8px_8px_0px_0px_#000] relative overflow-hidden mt-16">
           
           <h3 className="text-2xl font-black text-black mb-6 text-center uppercase">
             💬 Final review & Feedback
           </h3>
           <p className="text-center text-black font-bold mb-8">
             오늘 워크숍에서 <strong>가장 기억에 남는 것</strong>이나 <strong>느낀 점</strong>을 공유해주세요.
           </p>

           <div className="max-w-xl mx-auto mb-10 flex gap-4">
             <input 
               type="text" 
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="예: 우리 조원들의 열정적인 모습이 인상 깊었습니다!"
               className="flex-1 bg-white border-2 border-black px-4 py-3 text-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all"
               onKeyPress={(e) => e.key === 'Enter' && handleSubmitFeedback()}
             />
             <Button onClick={handleSubmitFeedback} disabled={!feedback.trim()}>
               Post
             </Button>
           </div>

           {/* Feedback List */}
           <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 bg-white border-2 border-black p-4">
             {feedbackList.length === 0 ? (
               <p className="text-center text-gray-400 font-bold py-4">아직 작성된 소감이 없습니다.</p>
             ) : (
               feedbackList.map((item) => (
                 <div key={item.id} className="bg-gray-50 border-b-2 border-black p-3 flex items-start gap-3 last:border-b-0">
                    <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-black text-xs shrink-0 border-2 border-black">
                      {item.authorName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-black">{item.authorName}</span>
                        <span className="text-xs text-white bg-black px-1 font-bold">{item.authorGroup}</span>
                      </div>
                      <p className="text-black text-sm font-medium">{item.content}</p>
                    </div>
                 </div>
               ))
             )}
           </div>
      </div>

      <div className="text-center pt-16">
           <Button variant="outline" onClick={onReset} className="px-10 py-4 text-lg">
             Restart (Logout)
           </Button>
      </div>
    </div>
  );
};
