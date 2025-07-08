"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const twitter_1 = __importDefault(require("./routes/twitter"));
const swagger_config_1 = require("./swagger/swagger-config");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true in production with HTTPS
}));
app.use(express_1.default.json());
app.use(twitter_1.default);
// Error handling middleware
app.use((error, req, res, next) => {
    console.error("Unhandled error:", error);
    res.status(500).json({ error: "Internal server error" });
});
// Setup Swagger documentation
(0, swagger_config_1.setupSwagger)(app);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`OAuth login URL: http://localhost:${port}/auth/login`);
});
exports.default = app;
