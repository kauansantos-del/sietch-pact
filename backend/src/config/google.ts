import { OAuth2Client } from 'google-auth-library';
import { env } from './env';

export const googleClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
});

export interface GoogleAuthUrlOptions {
  state: string;
  loginHint?: string;
}

export function buildGoogleAuthUrl({ state, loginHint }: GoogleAuthUrlOptions): string {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    hd: env.ALLOWED_EMAIL_DOMAIN, // filtra contas exibidas (NÃO é defesa de segurança)
    state,
    prompt: 'select_account',
    include_granted_scopes: true,
    login_hint: loginHint,
  });
}
