import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getBackendBaseUrl } from "@/lib/backend-url";

type BackendTokenResponse = {
  access_token: string;
  token_type: string;
  role: string;
  name?: string | null;
  email?: string | null;
};

async function authenticateAdmin(username: string, password: string) {
  const response = await fetch(`${getBackendBaseUrl()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username,
      password,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as BackendTokenResponse;
}

async function authenticateEmployee(email: string, otp: string) {
  const response = await fetch(`${getBackendBaseUrl()}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as BackendTokenResponse;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const data = await authenticateAdmin(credentials.username, credentials.password);
        if (!data) {
          return null;
        }

        return {
          id: credentials.username,
          name: data.name ?? credentials.username,
          email: data.email ?? undefined,
          accessToken: data.access_token,
          role: data.role,
        };
      },
    }),
    CredentialsProvider({
      id: "employee-otp",
      name: "Employee Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          return null;
        }

        const data = await authenticateEmployee(credentials.email, credentials.otp);
        if (!data) {
          return null;
        }

        return {
          id: data.email ?? credentials.email,
          name: data.name ?? data.email ?? credentials.email,
          email: data.email ?? credentials.email,
          accessToken: data.access_token,
          role: data.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.accessToken) {
        token.accessToken = user.accessToken;
      }
      if (user?.role) {
        token.role = user.role;
      }
      if (user?.email) {
        token.email = user.email;
      }
      if (user?.name) {
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (token.role) {
        session.role = token.role as string;
      }
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      if (token.name && session.user) {
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
