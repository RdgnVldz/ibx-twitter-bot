import OpenAI from "openai";
import { config } from "dotenv";
// Load environment variables from .env file
config();
// Configuration
export const CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
export const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
export const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY, // Add this to your .env file
});
