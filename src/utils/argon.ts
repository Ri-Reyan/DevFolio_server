import argon2 from "argon2";

const options = {
  type: argon2.argon2id as any,
  memoryCost: 2 ** 16,
  parallelism: 1,
  timeCost: 5,
};

const convertTohash = async (password: string) => {
  return await argon2.hash(password, options);
};

const verifyHash = async (hash: string, password: string) => {
  return await argon2.verify(hash, password);
};
