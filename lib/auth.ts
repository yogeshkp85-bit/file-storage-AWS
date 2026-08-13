const REGION = process.env.AWS_REGION || process.env.MY_AWS_REGION || "eu-north-1";
const rawClientId = process.env.COGNITO_CLIENT_ID || process.env.MY_COGNITO_CLIENT_ID;
const CLIENT_ID = (!rawClientId || rawClientId === "1t00oa7ldts3m16hk4nqkftd6g") ? "7jm7s8eqcs0qtm42dciaqq7bch" : rawClientId;

export type AuthUser = {
  userId: string;
  email: string;
  username: string;
};

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
  return cognitoRequest('SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email }
    ]
  });
}

// Confirm Sign Up with verification code
export async function confirmSignUpUser(email: string, code: string) {
  return cognitoRequest('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code
  });
}

// User Sign In
export async function signInUser(email: string, password: string) {
  const res = await cognitoRequest('InitiateAuth', {
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  });

  return {
    accessToken: res.AuthenticationResult?.AccessToken,
    idToken: res.AuthenticationResult?.IdToken,
    refreshToken: res.AuthenticationResult?.RefreshToken,
    expiresIn: res.AuthenticationResult?.ExpiresIn
  };
}
