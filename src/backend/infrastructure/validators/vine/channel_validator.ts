import vine from "@vinejs/vine";

export const createChannelValidator = vine.create(
  vine.object({
    name: vine
      .string()
      .alphaNumeric({
        allowDashes: true,
        allowSpaces: false,
        allowUnderscores: true,
      })
      .maxLength(24),
    server_id: vine.number({ strict: true }),
  }),
);

export const updateChannelValidator = vine.create(
  vine.object({
    id: vine.number({ strict: true }),
    name: vine
      .string()
      .alphaNumeric({
        allowDashes: true,
        allowSpaces: false,
        allowUnderscores: true,
      })
      .maxLength(24),
  }),
);
