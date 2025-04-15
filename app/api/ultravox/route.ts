import { NextResponse, NextRequest } from 'next/server';
import { CallConfig } from '@/lib/types';

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // If response is not ok, throw to trigger retry
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff (1s, 2s, 4s)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const body: CallConfig = await request.json();
    console.log('Attempting to call Ultravox API...');

    // Check if API key exists
    if (!process.env.ULTRAVOX_API_KEY) {
      console.error('Missing ULTRAVOX_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetchWithRetry('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ULTRAVOX_API_KEY,
      },
      body: JSON.stringify({ ...body }),
    });

    console.log('Ultravox API response status:', response.status);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in API route:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Error calling Ultravox API', details: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: 'An unknown error occurred.' },
        { status: 500 }
      );
    }
  }
}