import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

let userPool: CognitoUserPool | null = null;

export function getUserPool(): CognitoUserPool {
  if (!userPool) {
    userPool = new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    });
  }
  return userPool;
}

export function getCurrentUser(): CognitoUser | null {
  return getUserPool().getCurrentUser();
}

export function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = getCurrentUser();
    if (!user) return resolve(null);
    user.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session);
      }
    );
  });
}

export function signIn(
  email: string,
  password: string
): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
    });
  });
}

export function signUp(
  email: string,
  password: string
): Promise<CognitoUser | undefined> {
  return new Promise((resolve, reject) => {
    const attrs = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    getUserPool().signUp(email, password, attrs, [], (err, result) => {
      if (err) return reject(err);
      resolve(result?.user);
    });
  });
}

export function confirmSignUp(
  email: string,
  code: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function signOut(): void {
  const user = getCurrentUser();
  if (user) user.signOut();
}

export interface CognitoAuthUser {
  id: string;
  email: string;
  created_at?: string;
}

export async function getAuthUser(): Promise<CognitoAuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  const payload = session.getIdToken().decodePayload();
  return {
    id: payload.sub,
    email: payload.email,
    created_at: payload.auth_time
      ? new Date(payload.auth_time * 1000).toISOString()
      : undefined,
  };
}
