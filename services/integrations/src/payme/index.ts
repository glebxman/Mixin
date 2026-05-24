const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID || "";
const PAYME_SECRET_KEY = process.env.PAYME_SECRET_KEY || "";

export async function createPaymeTransaction(amount: number, userId: string) {
  // TODO: implement Payme payment creation
  return { transactionId: null };
}

export async function verifyPaymeTransaction(transactionId: string) {
  // TODO: implement Payme transaction verification
  return { verified: false };
}
