import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
const TELEGRAM_BOT_API_SECRET_TOKEN = process.env.TELEGRAM_BOT_API_SECRET_TOKEN || '';

interface SyncBotRequest {
  token: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken } = body;

    if (!botToken || typeof botToken !== 'string' || !botToken.trim()) {
      return NextResponse.json(
        { error: 'Bot token is required' },
        { status: 400 }
      );
    }

    // Get auth token from Authorization header
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

    const syncEndpoint = `${API_BASE_URL}/bots/sync`;
    const syncRequest: SyncBotRequest = {
      token: botToken.trim(),
    };

    const syncResponse = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(syncRequest),
    });

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: true,
          message: 'Bot connected but sync failed',
          syncError: errorData.detail || errorData.message || 'Failed to sync bot',
        },
        { status: 200 }
      );
    }

    const syncData = await syncResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Bot connected and synced successfully',
      syncData,
    });
  } catch (error) {
    console.error('Error connecting bot:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
