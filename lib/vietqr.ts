export type VietQrTemplate = "compact" | "compact2" | "print";

export type VietQrInput = {
  bankId: string;
  accountNumber: string;
  amount: number;
  accountName?: string;
  addInfo?: string;
  template?: VietQrTemplate;
};

const VIET_QR_BASE_URL = "https://img.vietqr.io/image";

/**
 * Generates a VietQR image URL.
 *
 * Example output:
 * https://img.vietqr.io/image/VCB-123456789-compact2.png?amount=500000&addInfo=Wedding%20Gift
 */
export function generateVietQrImageUrl(input: VietQrInput): string {
  const bankId = input.bankId.trim().toUpperCase();
  const accountNumber = input.accountNumber.trim();

  if (!bankId) {
    throw new Error("bankId is required.");
  }

  if (!accountNumber) {
    throw new Error("accountNumber is required.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("amount must be a positive number.");
  }

  const amount = Math.round(input.amount);
  const template = input.template ?? "compact2";
  const path = `${bankId}-${accountNumber}-${template}.png`;

  const params = new URLSearchParams({
    amount: amount.toString(),
  });

  if (input.addInfo?.trim()) {
    params.set("addInfo", input.addInfo.trim());
  }

  if (input.accountName?.trim()) {
    params.set("accountName", input.accountName.trim());
  }

  return `${VIET_QR_BASE_URL}/${path}?${params.toString()}`;
}