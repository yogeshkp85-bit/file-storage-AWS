import crypto from 'crypto';

const REGION = "eu-north-1";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || process.env.MY_COGNITO_CLIENT_ID || "7jm7s8eqcs0qtm42dciaqq7bch";
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || process.env.MY_COGNITO_CLIENT_SECRET || "d91lbfs9a5v3eu8nmevcd8lvgobetut9539nh3d67fe970jpvv1";

export type AuthUser = {
  userId: string;
  email: string;
  username: string;
};

// Calculate HMAC-SHA256 SecretHash required by AWS Cognito for clients with secrets
function calculateSecretHash(username: string): string | undefined {
  if (!CLIENT_SECRET) return undefined;
  return crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
}

// Helper to make raw HTTP requests to AWS Cognito Identity Provider Service
async function cognitoRequest(operation: string, payload: Record<string, any>) {
  const url = `https://cognito-idp.${REGION}.amazonaws.com/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${operation}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.__type || `Cognito ${operation} failed`);
  }
  return data;
}

// Verify an incoming Access Token by calling GetUser
export async function verifyToken(accessToken: string): Promise<AuthUser | null> {
  try {
    if (!accessToken) return null;
    
    // Support Bearer prefix if passed
    const cleanToken = accessToken.startsWith('Bearer ') ? accessToken.slice(7) : accessToken;
    if (!cleanToken) return null;

    const res = await cognitoRequest('GetUser', {
      AccessToken: cleanToken
    });

    const emailAttr = res.UserAttributes?.find((attr: any) => attr.Name === 'email');
    const subAttr = res.UserAttributes?.find((attr: any) => attr.Name === 'sub');

    return {
      userId: subAttr ? subAttr.Value : res.Username,
      email: emailAttr ? emailAttr.Value : res.Username,
      username: res.Username
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// User Sign Up
export async function signUpUser(email: string, password: string) {
  const secretHash = calculateSecretHash(email);
  return cognitoRequest('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    ...(secretHash ? { SecretHash: secretHash } : {}),
    UserAttributes: [
      { Name: 'email', Value: email }
    ]
  });
}

// Confirm Sign Up with verification code
export async function confirmSignUpUser(email: string, code: string) {
  const secretHash = calculateSecretHash(email);
  return cognitoRequest('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    ...(secretHash ? { SecretHash: secretHash } : {})
  });
}

// User Sign In
export async function signInUser(email: string, password: string) {
  const secretHash = calculateSecretHash(email);
  const authParams: Record<string, string> = {
    USERNAME: email,
    PASSWORD: password
  };
  if (secretHash) {
    authParams['SECRET_HASH'] = secretHash;
  }

  const res = await cognitoRequest('InitiateAuth', {
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: authParams
  });

  return {
    accessToken: res.AuthenticationResult?.AccessToken,
    idToken: res.AuthenticationResult?.IdToken,
    refreshToken: res.AuthenticationResult?.RefreshToken,
    expiresIn: res.AuthenticationResult?.ExpiresIn
  };
}
