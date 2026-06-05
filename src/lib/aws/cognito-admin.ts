import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

let client: CognitoIdentityProviderClient | null = null;
function getClient() {
  if (!client) {
    client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || "ap-northeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

const POOL_ID = () => process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;

export interface CognitoUser {
  username: string;
  sub: string;
  email: string | null;
  status: string;
  enabled: boolean;
  created: string | null;
}

export async function listCognitoUsers(): Promise<CognitoUser[]> {
  const out: CognitoUser[] = [];
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListUsersCommand({ UserPoolId: POOL_ID(), Limit: 60, PaginationToken: token })
    );
    for (const u of res.Users ?? []) {
      const attr = (n: string) =>
        u.Attributes?.find((a) => a.Name === n)?.Value ?? null;
      out.push({
        username: u.Username ?? "",
        sub: attr("sub") ?? u.Username ?? "",
        email: attr("email"),
        status: u.UserStatus ?? "",
        enabled: u.Enabled ?? true,
        created: u.UserCreateDate ? new Date(u.UserCreateDate).toISOString() : null,
      });
    }
    token = res.PaginationToken;
  } while (token);
  return out;
}

export async function deleteCognitoUser(username: string) {
  await getClient().send(
    new AdminDeleteUserCommand({ UserPoolId: POOL_ID(), Username: username })
  );
}

export async function setCognitoUserEnabled(username: string, enabled: boolean) {
  await getClient().send(
    enabled
      ? new AdminEnableUserCommand({ UserPoolId: POOL_ID(), Username: username })
      : new AdminDisableUserCommand({ UserPoolId: POOL_ID(), Username: username })
  );
}
