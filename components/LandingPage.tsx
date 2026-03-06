
import React from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fffdf5] text-black font-['Pretendard'] selection:bg-[#facc15] selection:text-black overflow-x-hidden">
      {/* CSS Animations */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .text-stroke {
          -webkit-text-stroke: 1px black;
          color: transparent;
        }
      `}</style>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fffdf5]/90 backdrop-blur-md border-b-[3px] border-black">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={onStart}>
            <div className="w-10 h-10 bg-[#2563eb] border-[3px] border-black flex items-center justify-center text-white font-black text-xl shadow-[2px_2px_0px_0px_#000] group-hover:rotate-12 transition-transform">B</div>
            <span className="text-2xl font-black uppercase tracking-tighter italic">Build Up</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-bold text-sm">
            <button onClick={() => scrollToSection('features')} className="hover:text-[#2563eb] transition-colors uppercase">주요 기능</button>
            <button onClick={() => scrollToSection('process')} className="hover:text-[#2563eb] transition-colors uppercase">진행 과정</button>
            <button onClick={() => scrollToSection('tech')} className="hover:text-[#2563eb] transition-colors uppercase">기술 소개</button>
          </nav>

          <Button onClick={onStart} className="hidden md:flex bg-black text-white hover:bg-gray-800 text-sm py-2 px-6 h-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            워크숍 입장하기
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:32px_32px]"></div>
        
        <div className="relative z-10 max-w-6xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] mb-8 font-black uppercase text-sm animate-bounce">
            ✨ HR 워크숍의 새로운 미래
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter mb-8 uppercase break-keep">
            조직의<br/>
            <span className="text-stroke">잠재력을</span><br/>
            <span className="text-[#2563eb]">깨우다</span>
          </h1>

          <p className="text-xl md:text-2xl font-bold text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            Google Gemini 기반의 AI 퍼실리테이터와 함께<br/>
            조직의 <span className="bg-black text-white px-1">미션</span>, <span className="bg-black text-white px-1">비전</span>, <span className="bg-black text-white px-1">핵심가치</span>를<br/>
            가장 빠르고 혁신적인 방법으로 도출하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onStart} className="text-xl px-12 py-6 h-auto bg-[#ff6b6b] text-white hover:bg-[#ff5252] shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000] transition-all">
              지금 시작하기 →
            </Button>
            <Button onClick={() => scrollToSection('features')} variant="outline" className="text-xl px-12 py-6 h-auto border-[3px]">
              더 알아보기
            </Button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/3 left-10 hidden lg:block animate-[pulse_3s_infinite]">
          <div className="w-32 h-32 bg-[#a855f7] rounded-full border-[4px] border-black opacity-30 blur-2xl"></div>
        </div>
        <div className="absolute bottom-1/4 right-10 hidden lg:block animate-[pulse_4s_infinite]">
          <div className="w-40 h-40 bg-[#2563eb] rounded-full border-[4px] border-black opacity-30 blur-2xl"></div>
        </div>
      </section>

      {/* Marquee Section */}
      <div className="w-full bg-black py-4 border-y-[3px] border-black overflow-hidden relative rotate-1 scale-105 z-20">
        <div className="whitespace-nowrap flex animate-marquee">
          {Array(10).fill("Mission Establishment • Vision Sharing • Core Values Internalization • Team Building • AI-Powered Workshop • ").map((text, i) => (
            <span key={i} className="text-2xl font-black text-white mx-4 uppercase tracking-wider">{text}</span>
          ))}
        </div>
      </div>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase mb-4 tracking-tighter">
              Why <span className="text-[#2563eb] underline decoration-4 underline-offset-8">Build Up?</span>
            </h2>
            <p className="text-xl font-bold text-gray-500 max-w-2xl">
              기존의 지루하고 비효율적인 워크숍은 잊으세요.<br/>
              참여와 몰입을 이끌어내는 완벽한 솔루션을 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
            {/* Feature 1: AI */}
            <div className="md:col-span-2 bg-[#f3e8ff] border-[3px] border-black p-8 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z" /></svg>
               </div>
               <div className="relative z-10">
                 <span className="bg-black text-white text-xs font-black px-2 py-1 uppercase">Powered by Gemini</span>
                 <h3 className="text-4xl font-black mt-4 mb-2">AI 퍼실리테이터</h3>
                 <p className="text-lg font-bold text-gray-700 max-w-md">
                   참여자의 의견을 실시간으로 분석하여 최적의 미션/비전 문구를 추천하고, 
                   데이터를 시각화하여 의사결정을 돕습니다.
                 </p>
               </div>
            </div>

            {/* Feature 2: Speed */}
            <div className="bg-[#fefce8] border-[3px] border-black p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between group">
               <div className="text-6xl mb-4 group-hover:scale-110 transition-transform origin-left">⚡</div>
               <div>
                 <h3 className="text-3xl font-black mb-2">2배 빠른 속도</h3>
                 <p className="font-bold text-gray-600">불필요한 논의 시간을 줄이고, 핵심에 집중하여 워크숍 시간을 단축합니다.</p>
               </div>
            </div>

            {/* Feature 3: Visual */}
            <div className="bg-[#ecfdf5] border-[3px] border-black p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between group">
               <div className="text-6xl mb-4 group-hover:scale-110 transition-transform origin-left">🎨</div>
               <div>
                 <h3 className="text-3xl font-black mb-2">창의적 결과물</h3>
                 <p className="font-bold text-gray-600">텍스트뿐만 아니라, 우리 팀의 정체성을 담은 고품질 포스터를 즉시 생성합니다.</p>
               </div>
            </div>

            {/* Feature 4: Collaboration */}
            <div className="md:col-span-2 bg-white border-[3px] border-black p-8 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1">
                    <span className="bg-[#2563eb] text-white text-xs font-black px-2 py-1 uppercase">Real-time Sync</span>
                    <h3 className="text-3xl font-black mt-4 mb-2">완벽한 협업</h3>
                    <p className="font-bold text-gray-700">
                      모든 팀원이 자신의 기기에서 동시에 접속하여 의견을 내고, 투표하며, 결과를 확인합니다.
                      누구도 소외되지 않는 참여형 워크숍을 경험하세요.
                    </p>
                  </div>
                  <div className="flex -space-x-4">
                     {[1,2,3,4].map(i => (
                       <div key={i} className="w-16 h-16 rounded-full border-[3px] border-black bg-gray-100 flex items-center justify-center font-black text-xl shadow-md z-10 relative first:bg-yellow-200 last:bg-pink-200">
                         {String.fromCharCode(64+i)}
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 px-6 bg-[#fffdf5] border-t-[3px] border-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black uppercase mb-16 text-center tracking-tighter">
            <span className="bg-black text-white px-2">Build Up</span> 프로세스
          </h2>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="absolute top-1/2 left-0 w-full h-2 bg-black -translate-y-1/2 hidden lg:block z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {[
                { step: '01', title: '팀 빌딩', desc: '아이스브레이킹 & 상호 이해', color: 'bg-[#ff6b6b]' },
                { step: '02', title: '정의', desc: '미션 & 비전 수립', color: 'bg-[#a855f7]' },
                { step: '03', title: '합의', desc: '핵심가치 & 행동약속', color: 'bg-[#10b981]' },
                { step: '04', title: '시각화', desc: '최종 결과물 생성', color: 'bg-[#facc15]' },
              ].map((item, idx) => (
                <div key={idx} className="group">
                  <div className={`w-full aspect-square bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-8 flex flex-col justify-between group-hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 ${item.color} rounded-bl-full border-l-[3px] border-b-[3px] border-black -mr-[3px] -mt-[3px] z-0`}></div>
                    <span className="text-6xl font-black text-black z-10 relative">{item.step}</span>
                    <div className="z-10 relative">
                      <h3 className="text-2xl font-black uppercase mb-2">{item.title}</h3>
                      <p className="font-bold text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Specs */}
      <section id="tech" className="py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block border-2 border-white px-4 py-1 rounded-full text-sm font-bold mb-8 animate-pulse">
            Powered by Google Cloud
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-8">
            Built with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Gemini Pro</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 leading-relaxed">
            단순한 챗봇이 아닙니다. Build Up은 <strong>Gemini 2.5 Flash</strong>의 초고속 추론 능력과<br/>
            <strong>Gemini 3 Pro Vision</strong>의 멀티모달 창작 능력을 결합하여<br/>
            워크숍의 모든 과정을 지능적으로 보조합니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
             {['Context Awareness (맥락 인식)', 'Real-time Reasoning (실시간 추론)', 'Image Generation (이미지 생성)', 'Creative Writing (창의적 작문)'].map((tech, i) => (
               <div key={i} className="border border-gray-700 p-4 rounded bg-gray-900">
                 <div className="w-2 h-2 bg-green-500 rounded-full mb-2"></div>
                 <span className="font-bold text-sm">{tech}</span>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 px-6 bg-[#fffdf5] text-center border-t-[3px] border-black">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-black uppercase mb-8 leading-tight">
            팀을 빌드업할<br/>준비가 되셨나요?
          </h2>
          <Button onClick={onStart} className="text-2xl px-16 py-8 h-auto bg-black text-white hover:bg-gray-800 shadow-[8px_8px_0px_0px_#2563eb] hover:shadow-[12px_12px_0px_0px_#2563eb] transition-all border-0 mx-auto">
            워크숍 시작하기 🚀
          </Button>
          <p className="mt-8 text-sm font-bold text-gray-400">
            © 2026 REFERENCE HRD. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
