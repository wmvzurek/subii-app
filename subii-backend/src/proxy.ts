import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista dozwolonych originsów
// W DEV: dodaj swoje lokalne IP z portem Expo
// W PROD: dodaj domenę produkcyjną
const ALLOWED_ORIGINS = [
  // Development
  'http://localhost:3000',
  'http://localhost:8081',
  'http://192.168.1.114:8081', // ← zmień na swoje IP (to samo co BASE_URL w api.ts)
  // Produkcja — dodaj gdy będziesz deployować
  // 'https://twoja-domena.pl',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0];

  // Obsługa preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Normalne requesty
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};