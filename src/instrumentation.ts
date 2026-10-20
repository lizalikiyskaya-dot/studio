export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startPaymentReminderScheduler } = await import("./lib/paymentReminderScheduler");
    const { startActivityDigestScheduler } = await import("./lib/activityDigest");
    startPaymentReminderScheduler();
    startActivityDigestScheduler();
  }
}
