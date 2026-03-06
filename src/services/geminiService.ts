
import { GoogleGenAI } from "@google/genai";
import { CORE_VALUE_OPTIONS } from '../constants';

// Lazy initialization of Gemini API
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiInstance;
};

export const GeminiService = {
  // Step 0: AI 프로필 생성 (텍스트 분석)
  generateProfile: async (
    keyword: string, 
    name: string, 
    dept: string, 
    dailyLife: string,
    condition: number
  ): Promise<string> => {
    try {
      const ai = getAI();
      const prompt = `
        당신은 기업 HR 전문가이자 심리 분석가입니다.
        아래 참가자의 정보를 바탕으로 이 사람의 **업무 스타일과 강점(Persona)**을 긍정적이고 매력적으로 분석해주세요.
        
        [참가자 정보]
        - 이름: ${name}
        - 소속(부서/팀): ${dept}
        - 현재 기분/상태(키워드): ${keyword}
        - 최근 일과 및 일상: ${dailyLife}
        - 오늘의 컨디션 점수: ${condition}점 (100점 만점)
 
        [요청사항]
        - 3~4줄 내외로 간결하게 작성하세요.
        - "당신은 ~입니다" 톤으로 작성하세요.
        - 참가자의 일상, 소속, 그리고 **컨디션 점수**를 자연스럽게 언급하며 공감대를 형성해주세요.
        - 점수가 높다면 에너지를 강조하고, 낮다면 격려와 함께 내재된 잠재력을 칭찬해주세요.
      `;
 
      // Use gemini-3-flash-preview for basic text tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "분석을 완료할 수 없습니다.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "AI 연결 상태가 불안정하여 기본 프로필을 생성합니다. 당신은 열정적인 팀원입니다!";
    }
  },

  // Step 0: AI 프로필 이미지 생성 (Nano Banana)
  generateProfileImage: async (keyword: string, gender: string, style: string): Promise<string | null> => {
    try {
      const ai = getAI();
      const prompt = `
        A high-quality avatar profile picture for a corporate workshop participant.
        Subject: A person, gender: ${gender}.
        Vibe/Mood: ${keyword}.
        Art Style: ${style}.
        Background: Abstract, soft gradient, professional, minimalistic.
        Composition: Headshot, centered, looking at camera.
        Lighting: Soft studio lighting.
        No text in image.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;

    } catch (error) {
      console.error("Gemini Image Gen Error:", error);
      return null;
    }
  },

  // Step 1: 미션 문장 추천 (로직 강화)
  recommendMission: async (companyName: string, keyword: string): Promise<string[]> => {
    try {
      const ai = getAI();
      const prompt = `
        당신은 기업 비전/미션 수립 전문가입니다. 
        회사명 '${companyName}'과 키워드 '${keyword}'를 바탕으로 이 조직이 세상에 존재하는 이유(미션) 문장 후보를 **반드시 딱 3가지만** 추천해주세요.
        
        [지시사항]
        1. 모든 추천 문장에는 회사명 '${companyName}'을 문맥에 맞게 자연스럽게 포함하세요. (예: '${companyName}은 ~합니다', '~를 지향하는 ${companyName}' 등)
        2. 문장은 신뢰감 있고 전문적인 어조로 작성하세요.
        3. 번호(1., 2., 3.)나 불필요한 글머리 기호(-, *) 없이 문장만 한 줄에 하나씩 출력하세요.
        4. 추가적인 설명이나 인사말은 절대 포함하지 마세요.
        5. 반드시 3개의 문장만 생성하세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "";
      // 줄바꿈으로 나누고, 불필요한 기호 제거 후 정확히 3개만 반환하는 필터링 로직 강화
      const results = text
        .split('\n')
        .map(line => line.replace(/^[\d\s\.\-\*]+/, '').trim())
        .filter(line => line.length > 5) // 최소 길이 체크로 유효하지 않은 줄 제외
        .slice(0, 3);

      // 만약 AI가 3개를 못 만들었을 경우를 대비한 Fallback
      if (results.length < 3) {
        return [
          `${companyName}은 ${keyword}를 통해 고객의 미래를 혁신합니다.`,
          `${keyword}의 전문성을 바탕으로 세상의 가치를 더하는 ${companyName}`,
          `신뢰와 기술로 ${keyword}의 새로운 기준을 세우는 파트너 ${companyName}`
        ].slice(0, 3);
      }

      return results;

    } catch (error) {
      console.error("Gemini API Error:", error);
      return [
        `${companyName}은 ${keyword}를 통해 고객의 미래를 혁신합니다.`,
        `${keyword}의 전문성을 바탕으로 세상의 가치를 더하는 ${companyName}`,
        `신뢰와 기술로 ${keyword}의 새로운 기준을 세우는 파트너 ${companyName}`
      ];
    }
  },

  // Step 1 & 2: Top 3 의견 종합 및 최적화
  synthesizeOpinions: async (type: 'Mission' | 'Vision', company: string, top3Inputs: string[]): Promise<string[]> => {
    const inputsText = top3Inputs.map((t, i) => `${i + 1}. ${t}`).join('\n');
    
    try {
      const ai = getAI();
      const prompt = `
        당신은 기업 전략 컨설턴트입니다. '${company}' 회사의 ${type} 수립 워크숍이 진행 중입니다.
        구성원들이 투표로 선정한 Top 3 의견이 아래와 같습니다.
        
        [Top 3 의견]
        ${inputsText}
        
        이 의견들의 핵심 의미를 모두 포괄하면서, 더 세련되고 전문적인 ${type} 문장 후보 3가지를 제안해주세요.
        출력 형식: 번호 없이 문장 3개를 줄바꿈으로 구분. 부가 설명 없이 문장만 출력.
      `;

      // Use gemini-3-pro-preview for complex reasoning tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      
      const text = response.text || "";
      return text.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^\d+\.\s*/, '').trim()).slice(0, 3);

    } catch (error) {
      console.error("Gemini API Error:", error);
      return top3Inputs.slice(0, 3); // Fallback to originals
    }
  },

  // Step 3: 핵심가치 추천 (Dynamic Options)
  recommendCoreValues: async (negative: string, positive: string, availableOptions: string[] = CORE_VALUE_OPTIONS): Promise<string[]> => {
    const optionsStr = availableOptions.join(", ");
    
    try {
      const ai = getAI();
      const prompt = `
        당신은 조직문화 전문가입니다.
        우리 조직의 '방해 요소(부정적 습관)'와 '강점(긍정적 자산)'을 분석하여, 
        이를 해결하거나 강화하기 위해 가장 필요한 핵심가치 3가지를 아래 목록에서 선정해주세요.

        [후보 목록]
        ${optionsStr}

        [분석 데이터]
        1. 미션 달성을 방해하는 나쁜 관습: "${negative}"
        2. 유지/강화해야 할 우리다운 강점: "${positive}"

        [출력 형식]
        부가적인 설명 없이, 선정된 핵심가치 단어 3개만 쉼표(,)로 구분하여 출력해주세요. (예: 소통, 도전, 신뢰)
      `;

      // Use gemini-3-pro-preview for complex reasoning tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      
      const text = response.text || "";
      return text.split(',').map(v => v.trim()).filter(v => v.length > 0).slice(0, 3);

    } catch (error) {
      console.error("Gemini API Error:", error);
      return [];
    }
  },

  // Step 4: 가치체계도 이미지 생성 (Nano Banana)
  generateStructureImage: async (mission: string, vision: string, values: string[]): Promise<string | null> => {
    try {
      const ai = getAI();
      const prompt = `
        A futuristic and professional infographic or diagram visualizing a corporate value structure.
        
        Elements to symbolize:
        1. Mission: "${mission}" (The Foundation/Root)
        2. Vision: "${vision}" (The Goal/Star)
        3. Core Values: "${values.join(', ')}" (The Pillars/Bridge)

        Style: Abstract 3D, Glassmorphism, Neon glowing accents, Corporate Blue and Purple tones.
        Composition: Hierarchical structure.
        No text in image.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Gemini Image Gen Error:", error);
      return null;
    }
  },

  // Step 5: 최종 팀 포스터 생성 (Nano Banana Pro = gemini-3-pro-image-preview)
  generateFinalTeamImage: async (teamName: string, mission: string, vision: string, values: string[], style: string, memberCount: number): Promise<string | null> => {
    // Style Specific Prompts
    const stylePrompts: Record<string, string> = {
        'blockbuster': 'Epic cinematic movie poster style. Dramatic lighting, heroic poses, high contrast, Hollywood blockbuster vibe.',
        '3d_animation': '3D Pixar/Disney animation style. Cute, expressive characters, vibrant colors, soft lighting, friendly atmosphere.',
        'isometric': '3D Isometric digital art. Miniature diorama, detailed, orthographic view, Sim City vibe, clean lines.',
        'pixel_art': '3D Voxel/Pixel art style. Minecraft or retro gaming aesthetic, blocky characters, nostalgic, colorful.',
        'cyberpunk': 'Cyberpunk futuristic style. Neon lights, rainy city background, high-tech gear, purple and cyan color palette.',
        'space': 'Space Odyssey style. Astronauts exploring a new planet, galaxy background, stars, futuristic suits, epic scale.',
        'lego': 'Lego brick style. Everything is made of plastic toy blocks, playful, constructive, colorful.',
        'watercolor': 'Studio Ghibli style watercolor. Hand-drawn, soft pastel colors, peaceful nature background, dreamy atmosphere.',
        'oil_painting': 'Grand classical oil painting. Museum quality, visible brushstrokes, dramatic lighting, dignified poses.',
        'paper_cutout': 'Layered paper cutout art style. 3D depth using paper layers, craft aesthetic, soft shadows, vibrant colors.'
    };

    const selectedStylePrompt = stylePrompts[style] || stylePrompts['blockbuster'];

    try {
      const ai = getAI();
      const prompt = `
        A high-resolution inspirational team poster for a corporate team named "${teamName}".
        
        **Visual Style:**
        ${selectedStylePrompt}
        
        **Subject (The Team):**
        A group of ${memberCount} professional characters (representing the team members) working together or looking towards a goal.
        The characters should be diverse and fit the chosen visual style.
        
        **Theme & Metaphor:**
        Visualize the following concepts in the background or composition:
        - Mission: "${mission}"
        - Vision: "${vision}"
        - Core Values: "${values.join(', ')}"

        **Composition:**
        - Center: The group of ${memberCount} characters.
        - Background: Abstract or scenic representation of their journey and success.
        - NO TEXT within the artwork itself.
        - High quality, detailed, masterpiece.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
           imageConfig: {
              aspectRatio: "16:9",
              imageSize: "2K"
           }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Gemini Final Image Gen Error:", error);
      return null;
    }
  }
};
