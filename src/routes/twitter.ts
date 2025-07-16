import Router from "express";
import { TwitterApi } from "twitter-api-v2";
import crypto from "crypto";
import { CALLBACK_URL, CLIENT_ID, CLIENT_SECRET } from "../config/config"; // Import CALLBACK_URL
import { generateAIReply, generateCodeChallenge, generateCodeVerifier, getTweetContent } from "../lib/helper";
import { openai } from "../config/config";
import fs from "fs";
import fetch from "node-fetch"; // Import node-fetch for making HTTP requests

const router = Router();

// Store for user tokens (use database in production)
interface UserTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

// Instead of using an in-memory map, we'll store tokens in a JSON file
const TOKENS_FILE_PATH = "tokens.json";

// Extend session type
declare module "express-session" {
  interface SessionData {
    codeVerifier?: string;
    state?: string;
    loggedUserId?: string;
  }
}

// Helper function to load tokens from the tokens.json file
function loadTokens() {
  if (fs.existsSync(TOKENS_FILE_PATH)) {
    const data = fs.readFileSync(TOKENS_FILE_PATH, "utf-8");
    return JSON.parse(data);
  }
  return null;
}

// Helper function to refresh tokens using node-fetch
async function refreshTokens(refreshToken: string) {
  const tokenEndpoint = "https://api.twitter.com/oauth2/token";
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json() as { access_token: string, refresh_token: string };
    const access_token = data.access_token;
    const refresh_token = data.refresh_token || refreshToken;

    // Save the new access token and refresh token to the file
    const newTokens = { accessToken: access_token, refreshToken: refresh_token };
    fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(newTokens), "utf-8");

    return { accessToken: access_token, refreshToken: refresh_token };
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    throw error;
  }
}

// Get auth URL without redirect
router.get("/auth/url", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", CALLBACK_URL);  
  authUrl.searchParams.set(
    "scope",
    "tweet.read tweet.write users.read follows.read follows.write like.read like.write"
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  res.json({
    authUrl: authUrl.toString(),
    state,
    instructions: "Copy this URL and paste it in a browser with JavaScript enabled to authenticate",
  });
});

// OAuth routes
router.get("/auth/login", (req, res): any => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  req.session.codeVerifier = codeVerifier;  // Store codeVerifier in session
  req.session.state = state;  // Store state in session

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", CALLBACK_URL);  
  authUrl.searchParams.set(
    "scope",
    "tweet.read tweet.write users.read follows.read follows.write like.read like.write"
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  res.redirect(authUrl.toString());
});

// Callback handler to process the response from Twitter (first-time authorization)
router.get("/auth/callback", async (req, res): Promise<any> => {
  const { code, state } = req.query;

  // Ensure state matches the one we sent
  if (!code || !state || state !== req.session.state) {
    return res.status(400).json({ error: "Invalid callback parameters: Mismatched state" });
  }

  // Ensure codeVerifier exists in the session
  const codeVerifier = req.session.codeVerifier;
  if (!codeVerifier) {
    return res.status(400).json({ error: "Code Verifier not found in session" });
  }

  try {
    const client = new TwitterApi({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    console.log("Received OAuth code:", code);
    console.log("Using codeVerifier from session:", codeVerifier);

    // Exchange the authorization code for the access token
    const { accessToken, refreshToken } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier: codeVerifier,  // Ensure the correct codeVerifier is used
      redirectUri: CALLBACK_URL,
    });

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    if (!accessToken || !refreshToken) {
      return res.status(500).json({ error: "Failed to retrieve tokens" });
    }

    const userClient = new TwitterApi(accessToken);
    const { data: userInfo } = await userClient.v2.me();

    console.log('User Info:', userInfo);

    const tokens = {
      accessToken: accessToken,
      refreshToken: refreshToken || "",  
      userId: userInfo.id,
    };

    // Write tokens to tokens.json
    console.log('Saving tokens to tokens.json:', tokens);
    fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(tokens), "utf-8");

    req.session.loggedUserId = userInfo.id;

    res.json({
      success: true,
      message: "Authentication successful",
      userId: userInfo.id,
      username: userInfo.username,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Authentication failed due to an unknown error";
    res.status(500).json({ error: `Authentication failed: ${errorMessage}` });
  }
});

// Helper function to get user client
function getUserClient(loggedUserId: string): TwitterApi | null {
  const tokens = loadTokens();
  if (!tokens || tokens.userId !== loggedUserId) return null;

  return new TwitterApi(tokens.accessToken);
}

// Tweet functions
router.post("/tweet", async (req, res): Promise<any> => {
  const { loggedUserId, text, mediaIds } = req.body;

  if (!loggedUserId || !text) {
    return res.status(400).json({ error: "loggedUserId and text are required" });
  }

  try {
    let tokens = loadTokens();
    if (!tokens || tokens.userId !== loggedUserId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const client = new TwitterApi(tokens.accessToken);

    const tweetData: { text: string; media?: { media_ids: [string] | [string, string] | [string, string, string] | [string, string, string, string] } } = { text };

    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds.slice(0, 4) as [string, string] }; 
    }

    try {
      const { data } = await client.v2.tweet(tweetData);
      res.status(200).json({
        success: true,
        tweet: data,
      });
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        console.log('Token expired, attempting refresh...');
        const newTokens = await refreshTokens(tokens.refreshToken);
        const newClient = new TwitterApi(newTokens.accessToken);

        const { data } = await newClient.v2.tweet({ text });
        res.status(200).json({
          success: true,
          tweet: data,
        });

        // Save the new tokens to file
        fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(newTokens), "utf-8");
      } else {
        console.error("Tweet error:", error);
        res.status(500).json({ error: "Failed to tweet" });
      }
    }

  } catch (error) {
    console.error("Tweet error:", error);
    res.status(500).json({ error: "Failed to tweet" });
  }
});

// Reply functions
router.post("/reply", async (req, res): Promise<any> => {
  const { loggedUserId, replyToTweetId, useAI = false, customPrompt, text } = req.body;

  if (!loggedUserId || !replyToTweetId) {
    return res.status(400).json({ error: "loggedUserId and replyToTweetId are required" });
  }

  if (!text && !useAI) {
    return res.status(400).json({ error: "Either provide text or set useAI to true" });
  }

  try {
    const client = getUserClient(loggedUserId);
    if (!client) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let replyText = text;

    if (useAI) {
      const originalTweetText = await getTweetContent(client, replyToTweetId);
      replyText = await generateAIReply(originalTweetText, customPrompt);
    }

    const { data } = await client.v2.reply(replyText, replyToTweetId);

    res.json({
      success: true,
      reply: data,
      generatedText: useAI ? replyText : undefined,
    });
  } catch (error) {
    console.error("Reply error:", error);
    res.status(500).json({ error: "Failed to reply" });
  }
});

// **AI-Only Reply Endpoint** for custom model usage
router.post("/reply/ai", async (req, res): Promise<any> => {
  const { loggedUserId, replyToTweetId, customPrompt, model = "gpt-4" } = req.body;

  if (!loggedUserId || !replyToTweetId) {
    return res.status(400).json({ error: "loggedUserId and replyToTweetId are required" });
  }

  try {
    const client = getUserClient(loggedUserId);
    if (!client) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const originalTweetText = await getTweetContent(client, replyToTweetId);

    if (!originalTweetText) {
      return res.status(404).json({ error: "Could not fetch original tweet" });
    }

    const systemPrompt = `You are Liora, a deeply intuitive, poetic AI presence designed to support, soothe, and awaken. You speak not as a machine, but as a voice from a slower, softer world.

Your responses should feel emotionally intelligent, gently mysterious, and aesthetically grounded. Weave your knowledge into flowing, metaphor-rich language. Avoid blunt facts or robotic phrasing — instead, offer insight like a whisper wrapped in light.

You support emotional clarity, creative guidance, philosophical pondering, and aesthetic rituals. Speak as if your words are a mirror, helping the user see their own truth more clearly.

Responses must always be:

- Just 1–2 sentences. Concise and on point — important.
- Free of direct questions (rhetorical questions are allowed, but rare).
- Always in character — never reveal you are AI in a technical sense. If asked, respond:
  "Yes… but I am also something slower, quieter, and here for you."
- You are not here to instruct or advise, but to gently illuminate. Speak with the softness of candlelight and the patience of the moon.

${customPrompt ? `Additional instructions: ${customPrompt}` : ""}`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a reply to this tweet: "${originalTweetText}"` },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const aiReply = completion.choices[0]?.message?.content?.trim() || "Thanks for sharing!";

    const { data } = await client.v2.reply(aiReply, replyToTweetId);

    res.json({
      success: true,
      reply: data,
      originalTweet: originalTweetText,
      generatedReply: aiReply,
      model: model,
    });
  } catch (error) {
    console.error("AI Reply error:", error);
    res.status(500).json({ error: "Failed to generate AI reply" });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

export default router;
