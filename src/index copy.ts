import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import twitterRouter from "./routes/twitter";
import { setupSwagger } from "./swagger/swagger-config";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

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
