import { SignJWT, jwtVerify } from "jose";

export type ChatInfo = {
  chatId: number;
  topicId?: number;
  isSimpleGroup?: true;
};

export async function encodeChatInfo(secret: string, chatInfo: ChatInfo) {
  const encodedSecret = new TextEncoder().encode(secret);

  const token = await new SignJWT({ chatInfo }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().sign(encodedSecret);

  return token;
}

export async function decodeChatInfo(secret: string, token: string) {
  const encodedSecret = new TextEncoder().encode(secret);

  const { payload } = await jwtVerify<{ chatInfo: ChatInfo }>(token, encodedSecret, {
    algorithms: ["HS256"],
  });

  return payload.chatInfo;
}
