/** New provider = new file implementing this + an env switch, never a refactor
 * of call sites (docs/ARCHITECTURE.md §6). Only StubOtpProvider exists in this
 * slice; MSG91/Twilio are Proposal Phase 2 (docs/ROADMAP.md). */
export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}
