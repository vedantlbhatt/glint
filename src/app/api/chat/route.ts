import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';

    return Response.json({ response: text });
  } catch (error) {
    console.error('Claude API error:', error);
    return Response.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    );
  }
}

