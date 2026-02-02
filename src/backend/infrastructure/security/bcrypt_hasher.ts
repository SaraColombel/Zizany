import bcrypt from "bcrypt";

export class BcryptHasher {
  #salt_rounds: number;
  constructor(private saltRounds?: number) {
    this.#salt_rounds = saltRounds ?? 12;
  }

  async hash(text: string) {
    return bcrypt.hash(text, this.#salt_rounds);
  }

  async verify(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
  }
}
