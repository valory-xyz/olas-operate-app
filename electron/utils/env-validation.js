/**
 * Validates environment variables
 */

require('dotenv').config();
const { z, ZodError } = require('zod');
const { app } = require('electron');

const nodeEnvRegex = new RegExp(/^(development|production)$/);

// Update z.object keys if env variable names change
const envSchema = z.object({
  NODE_ENV: z
    .string()
    .regex(
      nodeEnvRegex,
      'Invalid NODE_ENV, must be `development` or `production`',
    ),
  BASE_RPC: z.string().url('Invalid BASE_RPC must be a valid URL'),
  ETHEREUM_RPC: z.string().url('Invalid ETHEREUM_RPC_URL must be a valid URL'),
  GNOSIS_RPC: z.string().url('Invalid GNOSIS_RPC must be a valid URL'),
  OPTIMISM_RPC: z.string().url('Invalid OPTIMISM_RPC must be a valid URL'),
  POLYGON_RPC: z.string().url('Invalid POLYGON_RPC must be a valid URL'),
});

const validateEnv = () => {
  const { env } = process;
  try {
    envSchema.parse(env);
  } catch (error) {
    console.error(`Invalid environment variables in .env file`);
    console.log(JSON.stringify(error, null, 2));

    if (error instanceof ZodError) {
      for (const issue of error.errors) {
        console.error(issue.message);
      }
    } else {
      console.error('An unexpected error occurred:', error);
    }

    app.quit();
  }
};

module.exports = { validateEnv };
