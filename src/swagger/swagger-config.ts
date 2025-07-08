import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Twitter API Integration',
    version: '1.0.0',
    description: 'A comprehensive API for Twitter integration with OAuth2 authentication and AI-powered features',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://your-domain.com',
      description: 'Production server'
    }
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Twitter user ID'
          },
          username: {
            type: 'string',
            description: 'Twitter username'
          },
          name: {
            type: 'string',
            description: 'Display name'
          }
        }
      },
      Tweet: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Tweet ID'
          },
          text: {
            type: 'string',
            description: 'Tweet content'
          },
          author_id: {
            type: 'string',
            description: 'Author user ID'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Tweet creation timestamp'
          }
        }
      },
      AuthUrl: {
        type: 'object',
        properties: {
          authUrl: {
            type: 'string',
            description: 'OAuth2 authorization URL'
          },
          state: {
            type: 'string',
            description: 'State parameter for security'
          },
          instructions: {
            type: 'string',
            description: 'Instructions for authentication'
          }
        }
      },
      AuthCallback: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Authentication success status'
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          userId: {
            type: 'string',
            description: 'Authenticated user ID'
          },
          username: {
            type: 'string',
            description: 'Authenticated username'
          }
        }
      },
      TweetRequest: {
        type: 'object',
        required: ['loggedUserId', 'text'],
        properties: {
          loggedUserId: {
            type: 'string',
            description: 'Authenticated user ID',
            example: '1234567890123456789'
          },
          text: {
            type: 'string',
            maxLength: 280,
            description: 'Tweet content (max 280 characters)',
            example: 'Hello Twitter! 👋 This is my first tweet via API #TwitterAPI'
          },
          mediaIds: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of media IDs to attach',
            example: ['1234567890123456789_1', '1234567890123456789_2']
          }
        }
      },
      ReplyRequest: {
        type: 'object',
        required: ['loggedUserId', 'replyToTweetId'],
        properties: {
          loggedUserId: {
            type: 'string',
            description: 'Authenticated user ID',
            example: '1234567890123456789'
          },
          replyToTweetId: {
            type: 'string',
            description: 'ID of tweet to reply to',
            example: '1750123456789012345'
          },
          text: {
            type: 'string',
            maxLength: 280,
            description: 'Reply content (required if useAI is false)',
            example: 'Thanks for sharing this! Really helpful insights. 💡'
          },
          useAI: {
            type: 'boolean',
            default: false,
            description: 'Whether to generate AI reply',
            example: true
          },
          customPrompt: {
            type: 'string',
            description: 'Custom prompt for AI generation',
            example: 'Reply in a friendly and professional tone, asking a follow-up question'
          }
        }
      },
      AIReplyRequest: {
        type: 'object',
        required: ['loggedUserId', 'replyToTweetId'],
        properties: {
          loggedUserId: {
            type: 'string',
            description: 'Authenticated user ID',
            example: '1234567890123456789'
          },
          replyToTweetId: {
            type: 'string',
            description: 'ID of tweet to reply to',
            example: '1750123456789012345'
          },
          customPrompt: {
            type: 'string',
            description: 'Custom prompt for AI generation',
            example: 'Generate a witty and engaging reply that adds value to the conversation'
          },
          model: {
            type: 'string',
            default: 'gpt-4',
            description: 'AI model to use for generation',
            example: 'gpt-4',
            enum: ['gpt-4', 'gpt-3.5-turbo']
          }
        }
      },
      InteractionRequest: {
        type: 'object',
        required: ['loggedUserId', 'tweetId'],
        properties: {
          loggedUserId: {
            type: 'string',
            description: 'Authenticated user ID',
            example: '1234567890123456789'
          },
          tweetId: {
            type: 'string',
            description: 'Tweet ID to interact with',
            example: '1750123456789012345'
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Operation success status'
          },
          message: {
            type: 'string',
            description: 'Success message'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Health status'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Check timestamp'
          }
        }
      }
    }
  }
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

// Initialize swagger-jsdoc
const specs = swaggerJSDoc(options);

// Setup Swagger middleware
export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    // Enable interactive features
    swaggerOptions: {
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        // Add any default headers or modifications here
        console.log('API Request:', req.url, req.method);
        return req;
      },
      responseInterceptor: (res: any) => {
        // Log responses for debugging
        console.log('API Response:', res.status, res.url);
        return res;
      },
      persistAuthorization: true, // Remember auth between page refreshes
      displayRequestDuration: true, // Show request timing
      filter: true, // Enable endpoint filtering
      showExtensions: true,
      showCommonExtensions: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .try-out__btn { 
        background: #4CAF50; 
        color: white; 
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
      }
      .swagger-ui .btn.execute { 
        background: #2196F3; 
        color: white; 
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        font-weight: bold;
      }
      .swagger-ui .btn.execute:hover { 
        background: #1976D2; 
      }
      .swagger-ui .response-col_status {
        font-weight: bold;
      }
      .swagger-ui .response.success {
        border-left: 4px solid #4CAF50;
      }
      .swagger-ui .response.error {
        border-left: 4px solid #f44336;
      }
    `,
    customSiteTitle: "Twitter API Documentation - Interactive Testing",
    explorer: true // Enable the explorer bar
  }));
  
  // JSON endpoint for API spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  console.log('📚 Interactive Swagger documentation available at /api-docs');
  console.log('🧪 You can test all API endpoints directly in the browser!');
};

/**
 * @swagger
 * /auth/url:
 *   get:
 *     summary: Get OAuth2 authorization URL
 *     description: Returns the Twitter OAuth2 authorization URL for user authentication
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUrl'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/login:
 *   get:
 *     summary: Initiate OAuth2 login
 *     description: Redirects to Twitter OAuth2 or returns auth URL if json=true
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: json
 *         schema:
 *           type: string
 *           enum: ['true']
 *         description: Return JSON response instead of redirect
 *     responses:
 *       200:
 *         description: Auth URL returned (when json=true)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUrl'
 *       302:
 *         description: Redirect to Twitter OAuth2
 */

/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: OAuth2 callback endpoint
 *     description: Handles OAuth2 callback from Twitter and completes authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Twitter
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State parameter for security validation
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthCallback'
 *       400:
 *         description: Invalid callback parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /tweet:
 *   post:
 *     summary: Post a new tweet
 *     description: Creates a new tweet with optional media attachments
 *     tags: [Tweets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TweetRequest'
 *     responses:
 *       200:
 *         description: Tweet posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tweet:
 *                   $ref: '#/components/schemas/Tweet'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to tweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /reply:
 *   post:
 *     summary: Reply to a tweet
 *     description: Posts a reply to an existing tweet with optional AI generation
 *     tags: [Tweets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReplyRequest'
 *     responses:
 *       200:
 *         description: Reply posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   $ref: '#/components/schemas/Tweet'
 *                 generatedText:
 *                   type: string
 *                   description: AI-generated text (if useAI was true)
 *       400:
 *         description: Missing required parameters or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to reply
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /reply/ai:
 *   post:
 *     summary: Generate and post AI reply
 *     description: Generates an AI-powered reply to a tweet and posts it
 *     tags: [AI Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIReplyRequest'
 *     responses:
 *       200:
 *         description: AI reply posted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   $ref: '#/components/schemas/Tweet'
 *                 originalTweet:
 *                   type: string
 *                 generatedReply:
 *                   type: string
 *                 model:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Could not fetch original tweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to generate AI reply
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /reply/preview:
 *   post:
 *     summary: Preview AI reply without posting
 *     description: Generates an AI reply preview without actually posting it
 *     tags: [AI Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIReplyRequest'
 *     responses:
 *       200:
 *         description: AI reply preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 originalTweet:
 *                   type: string
 *                 generatedReply:
 *                   type: string
 *                 model:
 *                   type: string
 *                 preview:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Could not fetch original tweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to generate preview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /like:
 *   post:
 *     summary: Like a tweet
 *     description: Likes a tweet on behalf of the authenticated user
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionRequest'
 *     responses:
 *       200:
 *         description: Tweet liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 liked:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to like tweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /unlike:
 *   post:
 *     summary: Unlike a tweet
 *     description: Removes like from a tweet on behalf of the authenticated user
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionRequest'
 *     responses:
 *       200:
 *         description: Tweet unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 liked:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to unlike tweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /retweet:
 *   post:
 *     summary: Retweet a tweet
 *     description: Retweets a tweet on behalf of the authenticated user
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionRequest'
 *     responses:
 *       200:
 *         description: Tweet retweeted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 retweeted:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to retweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /unretweet:
 *   post:
 *     summary: Remove retweet
 *     description: Removes retweet from a tweet on behalf of the authenticated user
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InteractionRequest'
 *     responses:
 *       200:
 *         description: Retweet removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 retweeted:
 *                   type: boolean
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to remove retweet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /user/{loggedUserId}:
 *   get:
 *     summary: Get current user info
 *     description: Retrieves information about the authenticated user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: loggedUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: Authenticated user ID
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Failed to get user info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /logout/{loggedUserId}:
 *   post:
 *     summary: Logout user
 *     description: Logs out the user and removes stored tokens
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: loggedUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to logout
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the health status of the API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */

export default specs;