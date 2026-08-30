export type AuthMethod = "otp" | "magic" | "password";

export function parseAuthMethod(raw: string | null | undefined): AuthMethod {
  if (raw === "otp" || raw === "magic" || raw === "password") {
    return raw;
  }
  return "password";
}

export function prefillsAsEmail(raw: string | null | undefined): string {
  const email = (raw ?? "").trim();
  if (!email || email.length > 254 || email.includes("\n") || !email.includes("@")) {
    return "";
  }
  return email;
}
