
import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface OnboardingModalProps {
  userName: string;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ userName, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in text-black">
      <Card className="w-full max-w-2xl bg-[#fffdf5] border-[4px] border-black shadow-[12px_12px_0px_0px_#000] p-0 overflow-hidden relative">
        {/* Decorative Header */}
        <div className="bg-[#2563eb] h-4 w-full border-b-[3px] border-black"></div>

        <div className="p-8 md:p-10 relative z-10">
          <div className="text-center mb-8">
            <span className="inline-block py-1 px-3 bg-black text-white text-xs font-black mb-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
              Hello
            </span>
            <h2 className="text-4xl font-black text-black mb-4 uppercase leading-none">
              Hello, <span className="text-[#2563eb] underline decoration-4 decoration-black">{userName}님!</span>
            </h2>
            <p className="text-black font-bold text-lg">
              지금부터 우리 조직의 미래를 설계하는 여정을 시작합니다.
            </p>
          </div>

          <div className="bg-white p-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] mb-8">
            <h3 className="text-black font-black mb-4 text-center text-xl border-b-2 border-black pb-2">🚀 Workshop Guide</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black flex items-center justify-center text-xl shrink-0 text-white font-bold border-2 border-black">1</div>
                <div>
                  <strong className="text-black font-black block mb-1">Warm-up</strong>
                  <span className="text-gray-700 font-medium text-sm">AI가 분석해주는 나의 프로필로 아이스브레이킹!</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black flex items-center justify-center text-xl shrink-0 text-white font-bold border-2 border-black">2</div>
                <div>
                  <strong className="text-black font-black block mb-1">우리의 미션과 비전</strong>
                  <span className="text-gray-700 font-medium text-sm">우리 회사의 존재 이유와 미래 모습 정의</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black flex items-center justify-center text-xl shrink-0 text-white font-bold border-2 border-black">3</div>
                <div>
                  <strong className="text-black font-black block mb-1">우리의 핵심가치</strong>
                  <span className="text-gray-700 font-medium text-sm">우리의 일하는 방식을 정의하고 우리 모두의 결과물 확인</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-black font-bold text-sm mb-6 bg-yellow-200 inline-block px-2 border border-black">
              준비되셨나요? 차근차근 임무를 완수하며 자물쇠를 풀어보세요!
            </p>
            <Button onClick={onClose} className="w-full md:w-auto px-12 py-4 text-lg mx-auto bg-black text-white hover:bg-gray-800">
              Let's start! 🚀
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
