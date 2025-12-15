// DEPRECATED
// This file is no longer used.
// Logic has been moved to /api/send.js to support Vercel Serverless Functions in a Vite environment.
// Please refer to services/emailService.ts and api/send.js

export async function POST() {
  return new Response(JSON.stringify({ error: 'Endpoint deprecated. Use /api/send' }), { status: 410 });
}