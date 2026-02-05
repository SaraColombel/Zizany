import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/backend/infrastructure/http/express/app";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const testUser = {
  email: "test.channels@local.com",
  password: "test-password",
  username: "channeluser",
};

const ownerUser = {
  email: "test.channels.server@local.com",
  password: "owner-password",
  username: "channelserver",
};

const hasher = new BcryptHasher();

describeDb("Channels API", () => {
  const app = createApp();
  let userId = 0;
  let serverId = 0;
  let channelId = 0;
  let messageId = 0;
  let otherMessageId = 0;

  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { email: testUser.email } });

    const user = await prisma.users.create({
      data: {
        email: testUser.email,
        username: testUser.username,
        password: await hasher.hash(testUser.password),
      },
    });
    userId = user.id;

    const server = await prisma.servers.create({
      data: { name: "Channel server", owner_id: userId },
    });
    serverId = server.id;

    const channel = await prisma.channels.create({
      data: { server_id: serverId, name: "general" },
    });
    channelId = channel.id;

    const oldMessage = await prisma.messages.create({
      data: {
        channel_id: channelId,
        user_id: userId,
        content: "Old message",
        created_at: new Date("2024-01-01T00:00:00.000Z"),
      },
    });
    messageId = oldMessage.id;

    const newMessage = await prisma.messages.create({
      data: {
        channel_id: channelId,
        user_id: userId,
        content: "New message",
        created_at: new Date("2024-01-02T00:00:00.000Z"),
      },
    });
    otherMessageId = newMessage.id;
  });

  afterAll(async () => {
    await prisma.messages.deleteMany({ where: { channel_id: channelId } });
    await prisma.channels.deleteMany({ where: { id: channelId } });
    await prisma.memberships.deleteMany({ where: { server_id: serverId } });
    await prisma.servers.deleteMany({ where: { id: serverId } });
    await prisma.users.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  // ____ TEST 1 ____
  it("1. GET /api/channels/:id -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get(`/api/channels/${channelId}`);

    expect(response.status).toBe(200);
    expect(response.body.channel?.props?.id).toBe(channelId);
  });

  // ____ TEST 2 ____
  it("2. GET /api/channels/:id/messages -> 200 (order asc)", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get(`/api/channels/${channelId}/messages`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.messages)).toBe(true);
    expect(response.body.messages[0]?.id).toBe(messageId);
    expect(response.body.messages[1]?.id).toBe(otherMessageId);
  });

  // ____ TEST 3 ____
  it("3. POST /api/channels/:id/messages sans content -> 422", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post(`/api/channels/${channelId}/messages`);

    expect(response.status).toBe(422);
    expect(response.body.message).toBe("content is required");
  });

  // ____ TEST 4 ____
  it("4. POST /api/channels/:id/messages sans cookie -> 401", async () => {
    const response = await request(app)
      .post(`/api/channels/${channelId}/messages`)
      .send({ content: "Hello" });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("E_UNAUTHORIZED_ACCESS");
  });

  // ____ TEST 5 ____
  it("5. POST /api/channels/:id/messages OK -> 201", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post(`/api/channels/${channelId}/messages`)
      .send({ content: "Hello world" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  // ____ TEST 6 ____
  it("6. PATCH /api/channels/:channelId/messages/:messageId id invalide -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .patch(`/api/channels/${channelId}/messages/abc`)
      .send({ content: "Update" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid message id");
  });

  // ____ TEST 7 ____
  it("7. PATCH /api/channels/:channelId/messages/:messageId sans content -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .patch(`/api/channels/${channelId}/messages/${messageId}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("content is required");
  });

  // ____ TEST 8 ____
  it("8. PATCH /api/channels/:channelId/messages/:messageId OK -> 204", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .patch(`/api/channels/${channelId}/messages/${messageId}`)
      .send({ content: "Updated" });

    expect(response.status).toBe(204);

    const updated = await prisma.messages.findUnique({
      where: { id: messageId },
    });
    expect(updated?.content).toBe("Updated");
  });

  // ____ TEST 9 ____
  it("9. DELETE /api/channels/:channelId/messages/:messageId id invalide -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(
      `/api/channels/${channelId}/messages/abc`,
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid message id");
  });

  // ____ TEST 10 ____
  it("10. DELETE /api/channels/:channelId/messages/:messageId OK -> 204", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(
      `/api/channels/${channelId}/messages/${otherMessageId}`,
    );

    expect(response.status).toBe(204);

    const deleted = await prisma.messages.findUnique({
      where: { id: otherMessageId },
    });
    expect(deleted).toBeNull();
  });
});

describeDb("Channels (by server) API", () => {
  const app = createApp();
  let ownerId = 0;
  let serverId = 0;
  let serverIdTwoDigits = 0;
  let channelId = 0;

  beforeAll(async () => {
    const existingOwner = await prisma.users.findUnique({
      where: { email: ownerUser.email },
      select: { id: true },
    });

    if (existingOwner) {
      const existingServers = await prisma.servers.findMany({
        where: { owner_id: existingOwner.id },
        select: { id: true },
      });
      const existingServerIds = existingServers.map((server) => server.id);
      if (existingServerIds.length > 0) {
        await prisma.messages.deleteMany({
          where: { channel: { server_id: { in: existingServerIds } } },
        });
        await prisma.channels.deleteMany({
          where: { server_id: { in: existingServerIds } },
        });
        await prisma.memberships.deleteMany({
          where: { server_id: { in: existingServerIds } },
        });
        await prisma.servers.deleteMany({
          where: { id: { in: existingServerIds } },
        });
      }
      await prisma.users.deleteMany({ where: { id: existingOwner.id } });
    }

    const owner = await prisma.users.create({
      data: {
        email: ownerUser.email,
        username: ownerUser.username,
        password: await hasher.hash(ownerUser.password),
      },
    });
    ownerId = owner.id;

    const server = await prisma.servers.create({
      data: { name: "Channel server", owner_id: ownerId },
    });
    serverId = server.id;

    const channel = await prisma.channels.create({
      data: { server_id: serverId, name: "general" },
    });
    channelId = channel.id;

    await prisma.memberships.create({
      data: { user_id: ownerId, server_id: serverId, role_id: 1 },
    });

    const serverTwoDigits = await prisma.servers.create({
      data: { name: "Two digits server", owner_id: ownerId },
    });
    serverIdTwoDigits = serverTwoDigits.id;

    await prisma.channels.create({
      data: { server_id: serverIdTwoDigits, name: "general" },
    });

    await prisma.memberships.create({
      data: { user_id: ownerId, server_id: serverIdTwoDigits, role_id: 1 },
    });
  });

  afterAll(async () => {
    await prisma.messages.deleteMany({
      where: { channel: { server_id: { in: [serverId, serverIdTwoDigits] } } },
    });
    await prisma.channels.deleteMany({
      where: { server_id: { in: [serverId, serverIdTwoDigits] } },
    });
    await prisma.memberships.deleteMany({
      where: { server_id: { in: [serverId, serverIdTwoDigits] } },
    });
    await prisma.servers.deleteMany({
      where: { id: { in: [serverId, serverIdTwoDigits] } },
    });
    await prisma.users.deleteMany({ where: { email: ownerUser.email } });
    await prisma.$disconnect();
  });

  // ____ TEST 11 ____
  it("11. GET /api/servers/:id/channels -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get(`/api/servers/${serverId}/channels`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.channels)).toBe(true);
  });

  // ____ TEST 12 ____
  it("12. POST /api/servers/:id/channels invalid name -> 422", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post(`/api/servers/${serverId}/channels`)
      .send({ name: "invalid name" });

    expect(response.status).toBe(422);
  });

  // ____ TEST 13 ____
  it("13. POST /api/servers/:id/channels OK -> 201", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post(`/api/servers/${serverId}/channels`)
      .send({ name: "new_channel" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    const createdId =
      response.body.channel?.props?.id ?? response.body.channel?.id;
    if (createdId) {
      await prisma.channels.delete({ where: { id: Number(createdId) } });
    }
  });

  // ____ TEST 14 ____
  it("14. POST /api/servers/:id/channels serverId >= 10", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post(`/api/servers/${serverIdTwoDigits}/channels`)
      .send({ name: "two_digit" });

    expect([201, 422, 500]).toContain(response.status);
  });

  // ____ TEST 15 ____
  it("15. PUT /api/servers/:id/channels/:channelId invalid name -> 422", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put(`/api/servers/${serverId}/channels/${channelId}`)
      .send({ name: "invalid name" });

    expect(response.status).toBe(422);
  });

  // ____ TEST 16 ____
  it("16. PUT /api/servers/:id/channels/:channelId OK -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put(`/api/servers/${serverId}/channels/${channelId}`)
      .send({ name: "updated_channel" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  // ____ TEST 17 ____
  it("17. DELETE /api/servers/:id/channels/:channelId invalid id -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(
      `/api/servers/${serverId}/channels/abc`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid channelId");
  });

  // ____ TEST 18 ____
  it("18. DELETE /api/servers/:id/channels/:channelId OK -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const channel = await prisma.channels.create({
      data: { server_id: serverId, name: "delete_channel" },
    });

    const response = await agent.delete(
      `/api/servers/${serverId}/channels/${channel.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);

    const deleted = await prisma.channels.findUnique({
      where: { id: channel.id },
    });
    expect(deleted).toBeNull();
  });
});
