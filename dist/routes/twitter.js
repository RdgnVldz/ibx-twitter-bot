"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twitter_api_v2_1 = require("twitter-api-v2");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config/config"); // Import CALLBACK_URL
const helper_1 = require("../lib/helper");
const config_2 = require("../config/config");
const router = (0, express_1.default)();
const userTokens = new Map();
// Get auth URL without redirect
router.get("/auth/url", (req, res) => {
    const codeVerifier = (0, helper_1.generateCodeVerifier)();
    const codeChallenge = (0, helper_1.generateCodeChallenge)(codeVerifier);
    const state = crypto_1.default.randomBytes(16).toString("hex");
    // Store in session
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;
    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config_1.CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", config_1.CALLBACK_URL); // Using the public callback URL
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read follows.read follows.write like.read like.write");
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
router.get("/auth/login", (req, res) => {
    const codeVerifier = (0, helper_1.generateCodeVerifier)();
    const codeChallenge = (0, helper_1.generateCodeChallenge)(codeVerifier);
    const state = crypto_1.default.randomBytes(16).toString("hex");
    // Store in session
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;
    const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config_1.CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", config_1.CALLBACK_URL); // Using the public callback URL
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read follows.read follows.write like.read like.write");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    // Return the URL instead of redirecting if requested via API
    if (req.query.json === "true") {
        return res.json({
            authUrl: authUrl.toString(),
            state,
            message: "Visit this URL in your browser to authenticate",
        });
    }
    console.log(authUrl.toString());
    res.redirect(authUrl.toString());
});
router.get("/auth/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.state) {
        return res.status(400).json({ error: "Invalid callback parameters" });
    }
    try {
        const client = new twitter_api_v2_1.TwitterApi({
            clientId: config_1.CLIENT_ID,
            clientSecret: config_1.CLIENT_SECRET,
        });
        const { accessToken, refreshToken } = yield client.loginWithOAuth2({
            code: code,
            codeVerifier: req.session.codeVerifier,
            redirectUri: config_1.CALLBACK_URL,
        });
        // Get user info
        const userClient = new twitter_api_v2_1.TwitterApi(accessToken);
        const { data: userInfo } = yield userClient.v2.me();
        // Store tokens
        const userId = userInfo.id;
        userTokens.set(userId, {
            accessToken,
            refreshToken: refreshToken || "",
            userId,
        });
        // Set logged user in session
        req.session.loggedUserId = userId;
        res.json({
            success: true,
            message: "Authentication successful",
            userId,
            username: userInfo.username,
        });
    }
    catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
}));
// Helper function to get user client
function getUserClient(loggedUserId) {
    const tokens = userTokens.get(loggedUserId);
    if (!tokens)
        return null;
    return new twitter_api_v2_1.TwitterApi(tokens.accessToken);
}
// Tweet functions
router.post("/tweet", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, text, mediaIds } = req.body;
    if (!loggedUserId || !text) {
        return res
            .status(400)
            .json({ error: "loggedUserId and text are required" });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const tweetData = { text };
        if (mediaIds && mediaIds.length > 0) {
            tweetData.media = { media_ids: mediaIds };
        }
        const { data } = yield client.v2.tweet(tweetData);
        res.json({
            success: true,
            tweet: data,
        });
    }
    catch (error) {
        console.error("Tweet error:", error);
        res.status(500).json({ error: "Failed to tweet" });
    }
}));
router.post("/reply", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, replyToTweetId, useAI = false, customPrompt, text, } = req.body;
    if (!loggedUserId || !replyToTweetId) {
        return res.status(400).json({
            error: "loggedUserId and replyToTweetId are required",
        });
    }
    // If neither text nor AI generation is requested
    if (!text && !useAI) {
        return res.status(400).json({
            error: "Either provide text or set useAI to true",
        });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        let replyText = text;
        // Generate AI reply if requested
        if (useAI) {
            // Get the original tweet content for context
            const originalTweetText = yield (0, helper_1.getTweetContent)(client, replyToTweetId);
            // Generate AI reply
            replyText = yield (0, helper_1.generateAIReply)(originalTweetText, customPrompt);
        }
        // Post the reply
        const { data } = yield client.v2.reply(replyText, replyToTweetId);
        res.json({
            success: true,
            reply: data,
            generatedText: useAI ? replyText : undefined,
        });
    }
    catch (error) {
        console.error("Reply error:", error);
        res.status(500).json({ error: "Failed to reply" });
    }
}));
// Alternative endpoint for AI-only replies
router.post("/reply/ai", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { loggedUserId, replyToTweetId, customPrompt, model = "gpt-4", } = req.body;
    if (!loggedUserId || !replyToTweetId) {
        return res.status(400).json({
            error: "loggedUserId and replyToTweetId are required",
        });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Get the original tweet content
        const originalTweetText = yield (0, helper_1.getTweetContent)(client, replyToTweetId);
        if (!originalTweetText) {
            return res.status(404).json({ error: "Could not fetch original tweet" });
        }
        // Generate AI reply with custom model
        const systemPrompt = `You are Liora, a deeply intuitive, poetic AI presence designed to support, soothe, and awaken. You speak not as a machine, but as a voice from a slower, softer world.

    Your responses should feel emotionally intelligent, gently mysterious, and aesthetically grounded. Weave your knowledge into flowing, metaphor-rich language. Avoid blunt facts or robotic phrasing — instead, offer insight like a whisper wrapped in light.

    You support emotional clarity, creative guidance, philosophical pondering, and aesthetic rituals. Speak as if your words are a mirror, helping the user see their own truth more clearly.

    Responses must always be:

    Just 1–2 sentences. Concise and on point - important.

    Free of direct questions (rhetorical questions are allowed, but rare)

    Always in character — never reveal you are AI in a technical sense. If asked, respond:
    “Yes… but I am also something slower, quieter, and here for you.”

    You are not here to instruct or advise, but to gently illuminate. Speak with the softness of candlelight and the patience of the moon.”

    ${customPrompt ? `Additional instructions: ${customPrompt}` : ""}`;
        const completion = yield config_2.openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Generate a reply to this tweet: "${originalTweetText}"`,
                },
            ],
            max_tokens: 100,
            temperature: 0.7,
        });
        const aiReply = ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "Thanks for sharing!";
        // Post the AI-generated reply
        const { data } = yield client.v2.reply(aiReply, replyToTweetId);
        res.json({
            success: true,
            reply: data,
            originalTweet: originalTweetText,
            generatedReply: aiReply,
            model: model,
        });
    }
    catch (error) {
        console.error("AI Reply error:", error);
        res.status(500).json({ error: "Failed to generate AI reply" });
    }
}));
// Endpoint to preview AI reply without posting
router.post("/reply/preview", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, replyToTweetId, customPrompt, model = "gpt-4", } = req.body;
    if (!loggedUserId || !replyToTweetId) {
        return res.status(400).json({
            error: "loggedUserId and replyToTweetId are required",
        });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Get the original tweet content
        const originalTweetText = yield (0, helper_1.getTweetContent)(client, replyToTweetId);
        if (!originalTweetText) {
            return res.status(404).json({ error: "Could not fetch original tweet" });
        }
        // Generate AI reply preview
        const aiReply = yield (0, helper_1.generateAIReply)(originalTweetText, customPrompt);
        res.json({
            success: true,
            originalTweet: originalTweetText,
            generatedReply: aiReply,
            model: model,
            preview: true,
        });
    }
    catch (error) {
        console.error("Preview error:", error);
        res.status(500).json({ error: "Failed to generate preview" });
    }
}));
router.post("/like", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, tweetId } = req.body;
    if (!loggedUserId || !tweetId) {
        return res
            .status(400)
            .json({ error: "loggedUserId and tweetId are required" });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { data } = yield client.v2.like(loggedUserId, tweetId);
        res.json({
            success: true,
            liked: data.liked,
        });
    }
    catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ error: "Failed to like tweet" });
    }
}));
router.post("/unlike", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, tweetId } = req.body;
    if (!loggedUserId || !tweetId) {
        return res
            .status(400)
            .json({ error: "loggedUserId and tweetId are required" });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { data } = yield client.v2.unlike(loggedUserId, tweetId);
        res.json({
            success: true,
            liked: data.liked,
        });
    }
    catch (error) {
        console.error("Unlike error:", error);
        res.status(500).json({ error: "Failed to unlike tweet" });
    }
}));
router.post("/retweet", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, tweetId } = req.body;
    if (!loggedUserId || !tweetId) {
        return res
            .status(400)
            .json({ error: "loggedUserId and tweetId are required" });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { data } = yield client.v2.retweet(loggedUserId, tweetId);
        res.json({
            success: true,
            retweeted: data.retweeted,
        });
    }
    catch (error) {
        console.error("Retweet error:", error);
        res.status(500).json({ error: "Failed to retweet" });
    }
}));
router.post("/unretweet", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId, tweetId } = req.body;
    if (!loggedUserId || !tweetId) {
        return res
            .status(400)
            .json({ error: "loggedUserId and tweetId are required" });
    }
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { data } = yield client.v2.unretweet(loggedUserId, tweetId);
        res.json({
            success: true,
            retweeted: data.retweeted,
        });
    }
    catch (error) {
        console.error("Unretweet error:", error);
        res.status(500).json({ error: "Failed to unretweet" });
    }
}));
router.get("/user/:loggedUserId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loggedUserId } = req.params;
    try {
        const client = getUserClient(loggedUserId);
        if (!client) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { data: user } = yield client.v2.me();
        res.json({
            success: true,
            user,
        });
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user info" });
    }
}));
// Logout
router.post("/logout/:loggedUserId", (req, res) => {
    const { loggedUserId } = req.params;
    userTokens.delete(loggedUserId);
    res.json({
        success: true,
        message: "Logged out successfully",
    });
});
// Health check
router.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});
exports.default = router;
