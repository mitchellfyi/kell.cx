import { NextRequest, NextResponse } from 'next/server';
import { gatherContext } from '@/lib/rag/context-gatherer';
import { generateAnswer } from '@/lib/rag/answer-generator';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit.check(request);
    if (rateLimitResult?.error) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid question' },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: 'Question too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Gather relevant context based on the question
    const context = await gatherContext(question);

    if (!context || context.documents.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant information to answer your question. Please try rephrasing or asking about AI coding tools, pricing, features, or recent updates.",
        sources: []
      });
    }

    // Generate answer using the context
    const answer = await generateAnswer(question, context);

    return NextResponse.json({
      answer: answer.text,
      sources: answer.sources,
      confidence: answer.confidence
    });

  } catch (error) {
    console.error('Error in AI search API:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your question' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}