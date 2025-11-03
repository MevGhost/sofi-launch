import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend API
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/tokens?${searchParams}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // If backend returns success, forward the response
    if (data.success) {
      return NextResponse.json(data);
    }
    
    // Backend returned empty or no data, return empty array
    return NextResponse.json({
      success: true,
      data: {
        tokens: [],
        total: 0,
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
      },
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    // Return empty data on error
    return NextResponse.json({
      success: true,
      data: {
        tokens: [],
        total: 0,
        limit: 50,
        offset: 0,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/tokens/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create token' },
      { status: 500 }
    );
  }
}