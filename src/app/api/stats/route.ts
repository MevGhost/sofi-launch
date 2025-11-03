import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend API
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // If backend returns success, forward the response
    if (data.success) {
      return NextResponse.json(data);
    }
    
    // Return default stats if backend is not available
    return NextResponse.json({
      success: true,
      data: {
        tokensLaunched: 0,
        totalVolume: 0,
        activeTraders: 0,
        totalValueLocked: 0,
        launchFee: '0.02',
        platformFeePercentage: '2',
        topGainers: [],
        topVolume: [],
        recentLaunches: 0,
        bondingCurvesCompleted: 0,
        totalLiquidityDeployed: 0,
        averageTokenLifespan: '0 days',
        networkStatus: 'operational',
        gasPrice: '0.000012',
        blockNumber: 0,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return empty stats on error
    return NextResponse.json({
      success: true,
      data: {
        tokensLaunched: 0,
        totalVolume: 0,
        activeTraders: 0,
        totalValueLocked: 0,
        launchFee: '0.02',
        platformFeePercentage: '2',
        topGainers: [],
        topVolume: [],
        recentLaunches: 0,
        bondingCurvesCompleted: 0,
        totalLiquidityDeployed: 0,
        averageTokenLifespan: '0 days',
        networkStatus: 'operational',
        gasPrice: '0.000012',
        blockNumber: 0,
      },
      timestamp: Date.now(),
    });
  }
}