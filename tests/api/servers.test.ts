import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/backend/infrastructure/http/express/app";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const ROLE_OWNER = 1;
const ROLE_MEMBER = 3;

const ownerUser = {
  email: "test.owner@local.com",
  password: "owner-password",
  username: "owneruser",
};

const memberUser = {
  email: "test.member@local.com",
  password: "member-password",
  username: "memberuser",
};

const hasher = new BcryptHasher();

function findServerPayload(
  servers: Array<Record<string, unknown>>,
  serverId: number,
) {
  return servers.find((server) => server.id === serverId);
}

describeDb("Servers API", () => {
  const app = createApp();
  let ownerId = 0;
  let memberId = 0;
  let ownedServerId = 0;
  let deleteServerId = 0;

  beforeAll(async () => {
    await prisma.users.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email] } },
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

    const ownedServer = await prisma.servers.create({
      data: { name: "Owned server", owner_id: ownerId },
    });
    ownedServerId = ownedServer.id;

    await prisma.channels.create({
      data: { server_id: ownedServerId, name: "general" },
    });

    await prisma.memberships.createMany({
      data: [
        { user_id: ownerId, server_id: ownedServerId, role_id: ROLE_OWNER },
        { user_id: memberId, server_id: ownedServerId, role_id: ROLE_MEMBER },
      ],
    });

    const deleteServer = await prisma.servers.create({
      data: { name: "Delete server", owner_id: ownerId },
    });
    deleteServerId = deleteServer.id;

    await prisma.channels.create({
      data: { server_id: deleteServerId, name: "general" },
    });

    await prisma.memberships.create({
      data: {
        user_id: ownerId,
        server_id: deleteServerId,
        role_id: ROLE_OWNER,
      },
    });
  });

  afterAll(async () => {
    await prisma.messages.deleteMany({
      where: { channel: { server_id: { in: [ownedServerId, deleteServerId] } } },
    });
    await prisma.channels.deleteMany({
      where: { server_id: { in: [ownedServerId, deleteServerId] } },
    });
    await prisma.memberships.deleteMany({
      where: { server_id: { in: [ownedServerId, deleteServerId] } },
    });
    await prisma.servers.deleteMany({
      where: { id: { in: [ownedServerId, deleteServerId] } },
    });
    await prisma.users.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email] } },
    });
    await prisma.$disconnect();
  });

  // ____ TEST 1 ____
  it("1. GET /api/servers sans cookie -> 401", async () => {
    const response = await request(app).get("/api/servers");

    expect(response.status).toBe(401);
  });

  // ____ TEST 2 ____
  it("2. GET /api/servers avec cookie -> 200 + champs", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/servers");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.servers)).toBe(true);
    const payload = findServerPayload(response.body.servers, ownedServerId);
    expect(payload).toBeDefined();
    if (payload) {
      expect(payload).toHaveProperty("members");
      expect(payload).toHaveProperty("onlineMembers");
      expect(payload).toHaveProperty("isMember");
      expect(payload).toHaveProperty("canLeave");
      expect(payload).toHaveProperty("currentUserRoleId");
    }
  });

  // ____ TEST 3 ____
  it("3. GET /api/servers/:id -> 200 + flags", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get(`/api/servers/${ownedServerId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("server");
    expect(response.body).toHaveProperty("membership");
    expect(response.body).toHaveProperty("isAdmin");
    expect(response.body).toHaveProperty("isOwner");
    expect(response.body.isOwner).toBe(true);
  });

  // ____ TEST 4 ____
  it("4. POST /api/servers sans name -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/api/servers").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("name is required");
  });

  // ____ TEST 5 ____
  it("5. POST /api/servers OK -> 201 + channel + membership", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/api/servers").send({
      name: "New server",
    });

    expect(response.status).toBe(201);
    expect(response.body.server_id).toBeDefined();

    const createdId = Number(response.body.server_id);
    const channel = await prisma.channels.findFirst({
      where: { server_id: createdId, name: "général" },
    });
    const membership = await prisma.memberships.findFirst({
      where: { server_id: createdId, user_id: ownerId, role_id: ROLE_OWNER },
    });

    expect(channel).toBeTruthy();
    expect(membership).toBeTruthy();

    await prisma.messages.deleteMany({
      where: { channel: { server_id: createdId } },
    });
    await prisma.channels.deleteMany({ where: { server_id: createdId } });
    await prisma.memberships.deleteMany({ where: { server_id: createdId } });
    await prisma.servers.delete({ where: { id: createdId } });
  });

  // ____ TEST 6 ____
  it("6. PUT /api/servers/:id id invalide -> 400", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.put("/api/servers/abc").send({ name: "X" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid server id");
  });

  // ____ TEST 7 ____
  it("7. PUT /api/servers/:id not found -> 404", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put("/api/servers/999999")
      .send({ name: "X" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Server not found");
  });

  // ____ TEST 8 ____
  it("8. PUT /api/servers/:id non-owner -> 403", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put(`/api/servers/${ownedServerId}`)
      .send({ name: "New name" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only owner can update server");
  });

  // ____ TEST 9 ____
  it("9. DELETE /api/servers/:id non-owner -> 403", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: memberUser.email, password: memberUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(`/api/servers/${ownedServerId}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Only owner can delete server");
  });

  // ____ TEST 10 ____
  it("10. DELETE /api/servers/:id owner -> 204", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: ownerUser.email, password: ownerUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.delete(`/api/servers/${deleteServerId}`);

    expect(response.status).toBe(204);

    const server = await prisma.servers.findUnique({
      where: { id: deleteServerId },
    });
    expect(server).toBeNull();

    deleteServerId = 0;
  });
});
