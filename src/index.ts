import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import twitterRouter from "./routes/twitter";
import { setupSwagger } from "./swagger/swagger-config";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",  // Use a strong session secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",  // Only secure cookies in production
      httpOnly: true,  // Prevent client-side JS from accessing the session cookie
      maxAge: 3600000, // Session expiry (1 hour)
    },
  })
);

app.use(express.json());

// Use the Twitter routes for handling OAuth
app.use(twitterRouter);

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Setup Swagger documentation
setupSwagger(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`OAuth login URL: http://localhost:${port}/auth/login`);
});

export default app;
