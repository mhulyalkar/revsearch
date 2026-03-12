# RevSearch — Multi-Engine Reverse Image Search

Chrome extension that reverse image searches across Google, Bing, Yandex, and TinEye simultaneously, with optional AWS-backed user accounts for search history.

## Structure

- `extension/` — Chrome Extension (Manifest V3)
- `backend/` — AWS CDK infrastructure (API Gateway, Lambda, DynamoDB, Cognito, S3)
- `dashboard/` — React web dashboard for search history

## Getting Started

### Chrome Extension
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select `extension/`

### Backend
```bash
cd backend
npm install
npx cdk deploy
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev
```
