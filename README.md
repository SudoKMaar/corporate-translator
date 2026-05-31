# Corporate-Speak Decoder

Voice-first hackathon demo. Speak the polite version, see what they actually mean.

Stack: Next.js 16 · Web Speech API · Groq (Llama 3.3 70B).

## Setup

1. Get a free Groq API key at https://console.groq.com (takes 30 seconds).
2. Copy `.env.local.example` to `.env.local` and paste in your key:

   ```bash
   cp .env.local.example .env.local
   ```

3. Run dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in **Chrome or Edge** (Web Speech API isn't in Safari/Firefox).

## Deploy to Vercel

```bash
npx vercel
```

Then in the Vercel dashboard, add `GROQ_API_KEY` as an environment variable and redeploy.

## Demo flow

1. Click "Start speaking", say something corporate-flavored.
2. Stop. Hit "Decode".
3. Side-by-side: literal restatement vs. what they actually mean, with confidence, vibe, the tell, and a suggested response.
4. Or click any of the example chips for instant decoding.
