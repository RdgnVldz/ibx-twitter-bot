"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openai = exports.OPENAI_API_KEY = exports.CALLBACK_URL = exports.CLIENT_SECRET = exports.CLIENT_ID = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = require("dotenv");
// Load environment variables from .env file
(0, dotenv_1.config)();
// Configuration
exports.CLIENT_ID = process.env.TWITTER_CLIENT_ID;
exports.CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
exports.CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback';
exports.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Initialize OpenAI client
exports.openai = new openai_1.default({
    apiKey: exports.OPENAI_API_KEY, // Add this to your .env file
});
