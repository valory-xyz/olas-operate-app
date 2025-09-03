export type AgentsFunFormValues = {
  personaDescription: string;
  geminiApiKey: string;
  fireworksApiKey: string;
  fireworksApiEnabled: boolean;
  fireworksApiKeyName?: string;
  xUsername: string;
  xConsumerApiKey: string;
  xConsumerApiSecret: string;
  xBearerToken: string;
  xAccessToken: string;
  xAccessTokenSecret: string;
};

export type XCredentialsKeys =
  | 'TWEEPY_CONSUMER_API_KEY'
  | 'TWEEPY_CONSUMER_API_KEY_SECRET'
  | 'TWEEPY_BEARER_TOKEN'
  | 'TWEEPY_ACCESS_TOKEN'
  | 'TWEEPY_ACCESS_TOKEN_SECRET';
