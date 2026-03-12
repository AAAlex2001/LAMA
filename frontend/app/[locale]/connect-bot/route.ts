import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const TELEGRAM_BOT_API_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET || '';

interface BotRequest {
  token: string;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, botDescription } = body;

    if (!botToken || typeof botToken !== 'string' || !botToken.trim()) {
      return NextResponse.json(
        { error: 'Bot token is required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : null;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhookEndpoint = `${API_BASE_URL}/telegram/webhook/${encodeURIComponent(botToken.trim())}`;
    const webhookHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(TELEGRAM_BOT_API_SECRET_TOKEN ? { 'x-telegram-bot-api-secret-token': TELEGRAM_BOT_API_SECRET_TOKEN } : {}),
    };

    const webhookResponse = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: webhookHeaders,
    });

    if (!webhookResponse.ok) {
      const errorData = await webhookResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || errorData.message || 'Failed to connect webhook' },
        { status: webhookResponse.status }
      );
    }

    const botEndpoint = `${API_BASE_URL}/bots`;
    const botRequest: BotRequest = {
      token: botToken.trim(),
      description: botDescription.trim(),
    };

    const botResponse = await fetch(botEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(botRequest),
    });

    if (!botResponse.ok) {
      const errorData = await botResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: true,
          message: 'Bot created but connection failed',
          botError: errorData.detail || errorData.message || 'Failed to create bot',
        },
        { status: 200 }
      );
    }

    const botData = await botResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Bot connected and created successfully',
      botData,
    });
  } catch (error) {
    console.error('Error connecting bot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
