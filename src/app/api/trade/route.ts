import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const required = ['tokenAddress', 'type', 'amount'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate trade type
    if (!['buy', 'sell'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trade type. Must be "buy" or "sell"' },
        { status: 400 }
      );
    }
    
    // Mock trade execution
    const trade = {
      id: `trade-${Date.now()}`,
      tokenAddress: body.tokenAddress,
      type: body.type,
      amount: body.amount,
      price: (Math.random() * 0.01).toFixed(6),
      txHash: '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join(''),
      timestamp: Date.now(),
      status: 'success',
      gasUsed: '150000',
      gasFee: '0.002',
    };
    
    // TODO: Implement actual trade execution logic
    
    return NextResponse.json({
      success: true,
      data: trade,
      message: `${body.type === 'buy' ? 'Buy' : 'Sell'} order executed successfully`,
    });
  } catch (error) {
    // Error executing trade
    return NextResponse.json(
      { success: false, error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenAddress = searchParams.get('tokenAddress');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Generate mock trade history
    const trades = Array.from({ length: 100 }, (_, i) => ({
      id: `trade-${i}`,
      tokenAddress: tokenAddress || '0x' + Math.random().toString(16).substr(2, 40),
      type: Math.random() > 0.5 ? 'buy' : 'sell',
      amount: (Math.random() * 1000000).toFixed(0),
      price: (Math.random() * 0.01).toFixed(6),
      txHash: '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join(''),
      timestamp: Date.now() - (i * 60000 * Math.random() * 10),
      walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
    }));
    
    // Apply pagination
    const paginatedTrades = trades.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: {
        trades: paginatedTrades,
        total: trades.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    // Error fetching trades
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}