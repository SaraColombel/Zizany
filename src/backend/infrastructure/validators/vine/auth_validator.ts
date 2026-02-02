import vine from "@vinejs/vine";

export const loginValidator = vine.create(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().trim(),
  }),
);

export const registerValidator = vine.create(
  vine.object({
    username: vine
      .string()
      .alpha({ allowDashes: true, allowUnderscores: true, allowSpaces: false })
      .maxLength(24),
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().trim(),
    confirmPassword: vine.string().sameAs("password"),
  }),
);
