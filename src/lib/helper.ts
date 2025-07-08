import crypto from 'crypto';
import { TwitterApi } from 'twitter-api-v2';
import { openai } from '../config/config';

// Generate code verifier and challenge for PKCE
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Helper function to get tweet content for context
export async function getTweetContent(client: TwitterApi, tweetId: string): Promise<string> {
  try {
    const { data } = await client.v2.singleTweet(tweetId, {
      'tweet.fields': ['text', 'author_id', 'created_at']
    });
    return data.text || '';
  } catch (error) {
    console.error('Error fetching tweet:', error);
    return '';
  }
}

// Generate AI reply using OpenAI
export async function generateAIReply(originalTweet: string, context?: string): Promise<string> {
  try {
    const systemPrompt = `You are a helpful Twitter bot that generates thoughtful, engaging replies to tweets. 
    Keep responses under 280 characters, be friendly and conversational, and avoid controversial topics.
    ${context ? `Additional context: ${context}` : ''}`;

    const userPrompt = `Generate a reply to this tweet: "${originalTweet}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" for lower cost
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() || "Thanks for sharing!";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "Thanks for sharing!"; // Fallback message
  }
}