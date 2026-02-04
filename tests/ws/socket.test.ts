import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import request from "supertest";
import { io as ioClient, Socket } from "socket.io-client";
import { createApp, sessionMiddleware } from "@/backend/infrastructure/http/express/app";
import { attachSocket } from "@/backend/infrastructure/ws/socket";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const ownerUser = {
  email: "test.ws.owner@local.com",
  password: "owner-password",
  username: "wsowner",
};

const memberUser = {
  email: "test.ws.member@local.com",
  password: "member-password",
  username: "wsmember",
};

const outsiderUser = {
  email: "test.ws.outsider@local.com",
  password: "outsider-password",
  username: "wsoutsider",
};

const hasher = new BcryptHasher();

function getCookieFromResponse(response: request.Response) {
  const setCookieHeader = response.headers["set-cookie"];
  const raw = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : String(setCookieHeader ?? "");
  return raw.split(";")[0];
}

function connectSocket(url: string, cookie?: string) {
  return ioClient(url, {
    transports: ["websocket"],
    extraHeaders: cookie ? { Cookie: cookie } : undefined,
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 2000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function waitForNoEvent(socket: Socket, event: string, timeoutMs = 800) {
  return new Promise<void>((resolve, reject) => {
    let fired = false;
    const onEvent = () => {
      fired = true;
    };
    socket.once(event, onEvent);
    setTimeout(() => {
      socket.off(event, onEvent);
      if (fired) {
        reject(new Error(`${event} should not be emitted`));
      } else {
        resolve();
      }
    }, timeoutMs);
  });
}

describeDb("WebSocket", () => {
  const app = createApp();
  const server = http.createServer(app);
  const io = attachSocket(server, sessionMiddleware);
  let baseUrl = "";
  let ownerId = 0;
  let memberId = 0;
  let outsiderId = 0;
  let serverId = 0;
  let channelId = 0;
  let ownerCookie = "";
  let memberCookie = "";
  let outsiderCookie = "";

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;

    await prisma.users.deleteMany({
      where: {
        email: { in: [ownerUser.email, memberUser.email, outsiderUser.email] },
      },
    });

    const owner = await prisma.users.create({
      data: {
        email: ownerUser.email,
        username: ownerUser.username,
        password: await hasher.hash(ownerUser.password),
      },
    });
    ownerId = owner.id;

    const member = await prisma.users.create({
      data: {
        email: memberUser.email,
        username: memberUser.username,
        password: await hasher.hash(memberUser.password),
      },
    });
    memberId = member.id;

    const outsider = await prisma.users.create({
      data: {
        email: outsiderUser.email,
        username: outsiderUser.username,
        password: await hasher.hash(outsiderUser.password),
      },
    });
    outsiderId = outsider.id;

    const serverRow = await prisma.servers.create({
      data: { name: "WS server", owner_id: ownerId },
    });
    serverId = serverRow.id;

    const channel = await prisma.channels.create({
      data: { server_id: serverId, name: "general" },
    });
    channelId = channel.id;

    await prisma.memberships.createMany({
      data: [
        { user_id: ownerId, server_id: serverId, role_id: 1 },
        { user_id: memberId, server_id: serverId, role_id: 3 },
      ],
    });

    const ownerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });
    ownerCookie = getCookieFromResponse(ownerLogin);

    const memberLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });
    memberCookie = getCookieFromResponse(memberLogin);

    const outsiderLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: outsiderUser.email, password: outsiderUser.password });
    outsiderCookie = getCookieFromResponse(outsiderLogin);
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await prisma.messages.deleteMany({ where: { channel_id: channelId } });
    await prisma.channels.deleteMany({ where: { id: channelId } });
    await prisma.memberships.deleteMany({ where: { server_id: serverId } });
    await prisma.servers.deleteMany({ where: { id: serverId } });
    await prisma.users.deleteMany({
      where: { id: { in: [ownerId, memberId, outsiderId] } },
    });
    await prisma.$disconnect();
  });

  // ____ TEST 1 ____
  it("1. connect without session -> E_UNAUTHORIZED", async () => {
    const socket = connectSocket(baseUrl);
    const error = await waitForEvent<Error>(socket, "connect_error");

    expect(error.message).toBe("E_UNAUTHORIZED");
    socket.close();
  });

  // ____ TEST 2 ____
  it("2. connect with session -> OK", async () => {
    const socket = connectSocket(baseUrl, ownerCookie);
    await waitForEvent(socket, "connect");

    expect(socket.connected).toBe(true);
    socket.close();
  });

  // ____ TEST 3 ____
  it("3. server:join without membership -> error:permission", async () => {
    const socket = connectSocket(baseUrl, outsiderCookie);
    await waitForEvent(socket, "connect");

    socket.emit("server:join", { serverId });
    const payload = await waitForEvent<{ code: string }>(
      socket,
      "error:permission",
    );

    expect(payload.code).toBe("E_FORBIDDEN");
    socket.close();
  });

  // ____ TEST 4 ____
  it("4. server:join success -> server:joined + presence:update", async () => {
    const socket = connectSocket(baseUrl, ownerCookie);
    await waitForEvent(socket, "connect");

    socket.emit("server:join", { serverId });
    const joined = await waitForEvent<{ serverId: number }>(
      socket,
      "server:joined",
    );
    expect(joined.serverId).toBe(serverId);

    const presence = await waitForEvent<{ serverId: number; onlineUserIds: number[] }>(
      socket,
      "presence:update",
    );
    expect(presence.serverId).toBe(serverId);

    socket.close();
  });

  // ____ TEST 5 ____
  it("5. channel:join missing channel -> error:not_found", async () => {
    const socket = connectSocket(baseUrl, ownerCookie);
    await waitForEvent(socket, "connect");

    socket.emit("channel:join", { channelId: 999999 });
    const payload = await waitForEvent<{ code: string }>(
      socket,
      "error:not_found",
    );

    expect(payload.code).toBe("E_CHANNEL_NOT_FOUND");
    socket.close();
  });

  // ____ TEST 6 ____
  it("6. channel:join without membership -> error:permission", async () => {
    const socket = connectSocket(baseUrl, outsiderCookie);
    await waitForEvent(socket, "connect");

    socket.emit("channel:join", { channelId });
    const payload = await waitForEvent<{ code: string }>(
      socket,
      "error:permission",
    );

    expect(payload.code).toBe("E_FORBIDDEN");
    socket.close();
  });

  // ____ TEST 7 ____
  it("7. typing:start/stop -> typing:update", async () => {
    const sender = connectSocket(baseUrl, ownerCookie);
    const receiver = connectSocket(baseUrl, memberCookie);
    await waitForEvent(sender, "connect");
    await waitForEvent(receiver, "connect");

    sender.emit("channel:join", { channelId });
    receiver.emit("channel:join", { channelId });
    await waitForEvent(sender, "channel:joined");
    await waitForEvent(receiver, "channel:joined");

    sender.emit("typing:start", { channelId });
    const typingOn = await waitForEvent<{ isTyping: boolean }>(
      receiver,
      "typing:update",
    );
    expect(typingOn.isTyping).toBe(true);

    sender.emit("typing:stop", { channelId });
    const typingOff = await waitForEvent<{ isTyping: boolean }>(
      receiver,
      "typing:update",
    );
    expect(typingOff.isTyping).toBe(false);

    sender.close();
    receiver.close();
  });

  // ____ TEST 8 ____
  it("8. message:create empty content -> no event", async () => {
    const sender = connectSocket(baseUrl, ownerCookie);
    const receiver = connectSocket(baseUrl, memberCookie);
    await waitForEvent(sender, "connect");
    await waitForEvent(receiver, "connect");

    sender.emit("channel:join", { channelId });
    receiver.emit("channel:join", { channelId });
    await waitForEvent(sender, "channel:joined");
    await waitForEvent(receiver, "channel:joined");

    sender.emit("message:create", { channelId, content: "   " });
    await waitForNoEvent(receiver, "message:new");

    sender.close();
    receiver.close();
  });

  // ____ TEST 9 ____
  it("9. message:create success -> message:new broadcast", async () => {
    const sender = connectSocket(baseUrl, ownerCookie);
    const receiver = connectSocket(baseUrl, memberCookie);
    await waitForEvent(sender, "connect");
    await waitForEvent(receiver, "connect");

    sender.emit("channel:join", { channelId });
    receiver.emit("channel:join", { channelId });
    await waitForEvent(sender, "channel:joined");
    await waitForEvent(receiver, "channel:joined");

    const messagePromise = waitForEvent<{ content: string }>(
      receiver,
      "message:new",
    );
    sender.emit("message:create", { channelId, content: "hello ws" });

    const message = await messagePromise;
    expect(message.content).toBe("hello ws");

    sender.close();
    receiver.close();
  });

  // ____ TEST 10 ____
  it("10. disconnect -> presence:update", async () => {
    const primary = connectSocket(baseUrl, ownerCookie);
    const observer = connectSocket(baseUrl, memberCookie);
    await waitForEvent(primary, "connect");
    await waitForEvent(observer, "connect");

    primary.emit("server:join", { serverId });
    observer.emit("server:join", { serverId });
    await waitForEvent(primary, "server:joined");
    await waitForEvent(observer, "server:joined");

    const presencePromise = waitForEvent<{ serverId: number; onlineUserIds: number[] }>(
      observer,
      "presence:update",
    );

    primary.disconnect();
    const presence = await presencePromise;

    expect(presence.serverId).toBe(serverId);

    observer.close();
  });
});
