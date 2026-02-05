import vine from "@vinejs/vine";

export const createMessageValidator = vine.create(
  vine.object({
    channel_id: vine.number({ strict: true }),
    user_id: vine.number({ strict: true }),
    content: vine.string().trim(),
  }),
);
