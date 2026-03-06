<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8dd47a49-87fd-4aea-ae57-2a04d8aa8dbf

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY`:
   - `.env.example` 파일을 복사하여 `.env.local` 파일을 만듭니다.
   - [Google AI Studio](https://aistudio.google.com/)에서 발급받은 API 키를 `.env.local` 파일에 입력합니다.
   ```bash
   cp .env.example .env.local
   ```
3. Run the app:
   ```bash
   npm run dev
   ```

## Production Deployment (Vercel)

Vercel 등에 배포할 때는 환경 변수(Environment Variables) 설정 메뉴에서 다음 항목을 추가해 주세요:
- `GEMINI_API_KEY`: Google AI Studio에서 발급받은 API 키
- `API_KEY`: (호환성을 위해 필요한 경우 추가)
