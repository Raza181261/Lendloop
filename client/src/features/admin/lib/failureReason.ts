// Turns a raw technical error into a short reason + what to do about it.
export function explainFailure(raw?: string) {
  const e = (raw ?? "").toLowerCase();

  if (e.includes("error sending request") || e.includes("fetch failed")) {
    return {
      reason: "n8n unreachable",
      hint: "The tunnel or n8n is down. Start it, update the webhook URL, then Retry.",
    };
  }
  if (e.includes("http 404")) {
    return {
      reason: "Workflow not published",
      hint: "Publish “LendLoop - Request Notification” in n8n, then Retry.",
    };
  }
  if (e.includes("http 401")) {
    return {
      reason: "Signature rejected",
      hint: "N8N_HMAC_SECRET in Convex and LENDLOOP_HMAC_SECRET in n8n differ.",
    };
  }
  if (e.includes("http 5")) {
    return {
      reason: "n8n server error",
      hint: "Check the failed execution in n8n, then Retry.",
    };
  }
  if (e.includes("not set")) {
    return {
      reason: "Missing configuration",
      hint: "Set N8N_WEBHOOK_URL and N8N_HMAC_SECRET in Convex.",
    };
  }
  if (e.includes("no longer exist")) {
    return {
      reason: "Data was deleted",
      hint: "The request or user is gone. Retry can't succeed, so Dismiss it.",
    };
  }
  return {
    reason: "Unknown error",
    hint: "Open the event in the Convex dashboard for details.",
  };
}

export function eventTypeLabel(type: string) {
  switch (type) {
    case "request.created":
      return "New request";
    case "request.status_changed":
      return "Request status changed";
    case "loan.returned":
      return "Loan returned";
    default:
      return type;
  }
}
