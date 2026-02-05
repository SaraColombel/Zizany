import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/backend/infrastructure/http/express/app";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_MEMBER = 3;

const ownerUser = {
  email: "test.membership.owner@local.com",
  password: "owner-password",
  username: "owneruser",
};

const memberUser = {
  email: "test.membership.member@local.com",
  password: "member-password",
  username: "memberuser",
};

const targetUser = {
  email: "test.membership.target@local.com",
  password: "target-password",
  username: "targetuser",
};

const hasher = new BcryptHasher();

describeDb("Memberships API", () => {
  const app = createApp();
  let ownerId = 0;
  let memberId = 0;
  let targetId = 0;
  let ownedServerId = 0;
  let joinServerId = 0;
  let leaveServerId = 0;

  beforeAll(async () => {
    await prisma.users.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email, targetUser.email] } },
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

    const target = await prisma.users.create({
      data: {
        email: targetUser.email,
        username: targetUser.username,
        password: await hasher.hash(targetUser.password),
      },
    });
    targetId = target.id;

    const ownedServer = await prisma.servers.create({
      data: { name: "Owned server", owner_id: ownerId },
    });
    ownedServerId = ownedServer.id;

    const joinServer = await prisma.servers.create({
      data: { name: "Join server", owner_id: ownerId },
    });
    joinServerId = joinServer.id;

    const leaveServer = await prisma.servers.create({
      data: { name: "Leave server", owner_id: ownerId },
    });
    leaveServerId = leaveServer.id;

    await prisma.channels.createMany({
      data: [
        { server_id: ownedServerId, name: "general" },
        { server_id: joinServerId, name: "general" },
        { server_id: leaveServerId, name: "general" },
      ],
    });

    await prisma.memberships.createMany({
      data: [
        { user_id: ownerId, server_id: ownedServerId, role_id: ROLE_OWNER },
        { user_id: memberId, server_id: ownedServerId, role_id: ROLE_MEMBER },
        { user_id: targetId, server_id: ownedServerId, role_id: ROLE_MEMBER },
        { user_id: ownerId, server_id: joinServerId, role_id: ROLE_OWNER },
        { user_id: ownerId, server_id: leaveServerId, role_id: ROLE_OWNER },
        { user_id: memberId, server_id: leaveServerId, role_id: ROLE_MEMBER },
      ],
    });
  });

  afterAll(async () => {
    await prisma.messages.deleteMany({
      where: { channel: { server_id: { in: [ownedServerId, joinServerId, leaveServerId] } } },
    });
    await prisma.channels.deleteMany({
      where: { server_id: { in: [ownedServerId, joinServerId, leaveServerId] } },
    });
    await prisma.memberships.deleteMany({
      where: { server_id: { in: [ownedServerId, joinServerId, leaveServerId] } },
    });
    await prisma.servers.deleteMany({
      where: { id: { in: [ownedServerId, joinServerId, leaveServerId] } },
    });
    await prisma.users.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email, targetUser.email] } },
    });
    await prisma.$disconnect();
  });

  // ____ TEST 1 ____
  it("1. GET /api/servers/:id/members id invalide -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/servers/abc/members");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid serverId");
  });

  // ____ TEST 2 ____
  it("2. GET /api/servers/:id/members OK -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get(`/api/servers/${ownedServerId}/members`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.members)).toBe(true);
  });

  // ____ TEST 3 ____
  it("3. POST /api/servers/:id/join id invalide -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/api/servers/abc/join");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid server id");
  });

  // ____ TEST 4 ____
  it("4. POST /api/servers/:id/join server not found -> 404", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/api/servers/999999/join");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Server not found");
  });

  // ____ TEST 5 ____
  it("5. POST /api/servers/:id/join already member -> 409", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post(`/api/servers/${ownedServerId}/join`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Already a member");
  });

  // ____ TEST 6 ____
  it("6. POST /api/servers/:id/join OK -> 201", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post(`/api/servers/${joinServerId}/join`);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  // ____ TEST 7 ____
  it("7. DELETE /api/servers/:id/leave owner -> 403", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(`/api/servers/${ownedServerId}/leave`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "Owner cannot leave server (delete it instead)",
    );
  });

  // ____ TEST 8 ____
  it("8. DELETE /api/servers/:id/leave OK -> 204", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(`/api/servers/${leaveServerId}/leave`);

    expect(response.status).toBe(204);

    const membership = await prisma.memberships.findFirst({
      where: { user_id: memberId, server_id: leaveServerId },
    });
    expect(membership).toBeNull();
  });

  // ____ TEST 9 ____
  it("9. PUT /api/servers/:id/members/:userId caller not owner -> 403", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put(`/api/servers/${ownedServerId}/members/${targetId}`)
      .send({ role_id: ROLE_ADMIN });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only owner can update roles");
  });

  // ____ TEST 10 ____
  it("10. PUT /api/servers/:id/members/:userId update role -> 204", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put(`/api/servers/${ownedServerId}/members/${targetId}`)
      .send({ role_id: ROLE_ADMIN });

    expect(response.status).toBe(204);

    const membership = await prisma.memberships.findFirst({
      where: { user_id: targetId, server_id: ownedServerId },
    });
    expect(membership?.role_id).toBe(ROLE_ADMIN);
  });
});
