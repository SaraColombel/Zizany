import vine from "@vinejs/vine";

export const loginValidator = vine.create(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().trim(),
  }),
);
