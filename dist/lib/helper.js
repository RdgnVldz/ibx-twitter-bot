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
exports.generateCodeVerifier = generateCodeVerifier;
exports.generateCodeChallenge = generateCodeChallenge;
exports.getTweetContent = getTweetContent;
exports.generateAIReply = generateAIReply;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config/config");
// Generate code verifier and challenge for PKCE
function generateCodeVerifier() {
    return crypto_1.default.randomBytes(32).toString('base64url');
}
function generateCodeChallenge(verifier) {
    return crypto_1.default.createHash('sha256').update(verifier).digest('base64url');
}
// Helper function to get tweet content for context
function getTweetContent(client, tweetId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield client.v2.singleTweet(tweetId, {
                'tweet.fields': ['text', 'author_id', 'created_at']
            });
            return data.text || '';
        }
        catch (error) {
            console.error('Error fetching tweet:', error);
            return '';
        }
    });
}
// Generate AI reply using OpenAI
function generateAIReply(originalTweet, context) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const systemPrompt = `You are a helpful Twitter bot that generates thoughtful, engaging replies to tweets. 
    Keep responses under 280 characters, be friendly and conversational, and avoid controversial topics.
    ${context ? `Additional context: ${context}` : ''}`;
            const userPrompt = `Generate a reply to this tweet: "${originalTweet}"`;
            const completion = yield config_1.openai.chat.completions.create({
                model: "gpt-4", // or "gpt-3.5-turbo" for lower cost
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 100,
                temperature: 0.7,
            });
            return ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "Thanks for sharing!";
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            return "Thanks for sharing!"; // Fallback message
        }
    });
}
