import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/backend/infrastructure/http/express/app";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const testUser = {
  email: "test.auth@local.com",
  password: "test-password",
  username: "testauth",
};

const signupUser = {
  email: "test.signup@local.com",
  password: "signup-password",
  username: "signupuser",
};

const hasher = new BcryptHasher();

describeDb("Auth API", () => {
  const app = createApp();

  beforeAll(async () => {
    await prisma.users.deleteMany({
      where: { email: { in: [testUser.email, signupUser.email] } },
    });
    await prisma.users.create({
      data: {
        email: testUser.email,
        username: testUser.username,
        password: await hasher.hash(testUser.password),
      },
    });
  });


  afterAll(async () => {
    await prisma.users.deleteMany({
      where: { email: { in: [testUser.email, signupUser.email] } },
    });
    await prisma.$disconnect();
  });


  // _____________ TEST 1  _____________
  it("1. POST /api/auth/login OK -> cookie set", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe("AUTHORIZED_ACCESS");

    const setCookieHeader = response.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    const cookie = Array.isArray(setCookieHeader)
      ? setCookieHeader.join("; ")
      : String(setCookieHeader);
    expect(cookie).toContain("connect.sid=");
  });


  // _____________ TEST 2  _____________
  it("2. GET /api/auth/me sans cookie -> 401", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("E_UNAUTHORIZED_ACCESS");
  });


  // _____________ TEST 3  _____________
  it("3. POST /api/auth/login wrong password -> 401", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "bad-password" });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("E_UNAUTHORIZED_ACCESS");
  });


  // _____________ TEST 4  _____________
  it("4. POST /api/auth/login unknown email -> 401", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown.auth@local.com", password: "whatever" });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("E_UNAUTHORIZED_ACCESS");
  });


  // _____________ TEST 5  _____________
  it("5. POST /api/auth/login invalid payload -> 422", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "x" });

    expect(response.status).toBe(422);
  });


  // _____________ TEST 6  _____________
  it("6. POST /api/auth/signup OK -> 200", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        email: signupUser.email,
        username: signupUser.username,
        password: signupUser.password,
        confirmPassword: signupUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe("AUTHORIZED_ACCESS");
    expect(response.body.user?.email).toBe(signupUser.email);
    expect(response.body.user?.username).toBe(signupUser.username);
  });


  // _____________ TEST 7  _____________
  it("7. POST /api/auth/signup email already used -> 401", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        email: testUser.email,
        username: "anotheruser",
        password: "password",
        confirmPassword: "password",
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("EMAIL_ALREADY_USED");
  });


  // _____________ TEST 8  _____________
  it("8. POST /api/auth/signup invalid payload -> 422", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "invalid-email",
        username: "signupuser",
        password: "password",
        confirmPassword: "password",
      });

    expect(response.status).toBe(422);
  });


  // _____________ TEST 9  _____________
  it("9. POST /api/auth/logout OK -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.code).toBe("DISCONNECTED");
    const setCookieHeader = response.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
  });


  // _____________ TEST 10  _____________
  it("10. GET /api/auth/me avec cookie -> 200", async () => {
    const agent = request.agent(app);
    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(testUser.email);
    expect(response.body.username).toBe(testUser.username);
  });
});
