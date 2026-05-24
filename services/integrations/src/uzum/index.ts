const UZUM_MERCHANT_ID = process.env.UZUM_MERCHANT_ID || "";
const UZUM_SECRET_KEY = process.env.UZUM_SECRET_KEY || "";

export async function createUzumTransaction(amount: number, userId: string) {
  // TODO: implement Uzum Pay payment creation
  return { transactionId: null };
}

export async function verifyUzumTransaction(transactionId: string) {
  // TODO: implement Uzum Pay transaction verification
  return { verified: false };
}
