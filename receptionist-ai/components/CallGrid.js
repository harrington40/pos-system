import CallCard from "./CallCard";

const SAMPLE_CALLS = [
  {
    id: "c1",
    phoneNumber: "+1 555 203 8821",
    callerName: "Sarah Johnson",
    duration: "02:34",
    status: "active",
    timestamp: "2:41 PM",
    department: "Sales",
    aiSummary:
      "Customer inquiring about monthly pricing for the Enterprise plan. She compared pricing with a competitor. AI transferred the call to the sales team after collecting contact info.",
    sentiment: "positive",
    intent: "Pricing inquiry",
  },
  {
    id: "c2",
    phoneNumber: "+1 555 874 0012",
    callerName: "Marcus Reid",
    duration: "00:52",
    status: "incoming",
    timestamp: "2:43 PM",
    department: null,
    aiSummary:
      "Caller requested technical support for integration issues. Ticket #4421 was auto-created. Awaiting assignment.",
    sentiment: "neutral",
    intent: "Technical support",
  },
  {
    id: "c3",
    phoneNumber: "+1 555 994 3310",
    callerName: "Diana Wu",
    duration: "01:18",
    status: "on-hold",
    timestamp: "2:39 PM",
    department: "Billing",
    aiSummary:
      "Customer disputing an invoice from last month. Billing team is reviewing account. AI placed call on hold after collecting account number.",
    sentiment: "negative",
    intent: "Billing dispute",
  },
  {
    id: "c4",
    phoneNumber: "+1 555 101 7755",
    callerName: "James Puerto",
    duration: "03:07",
    status: "ended",
    timestamp: "2:28 PM",
    department: "Support",
    aiSummary:
      "Installation issue resolved remotely. Customer confirmed product is working. CSAT survey sent post-call.",
    sentiment: "positive",
    intent: "Installation help",
  },
  {
    id: "c5",
    phoneNumber: "+1 555 090 4499",
    callerName: "Unknown",
    duration: "00:00",
    status: "missed",
    timestamp: "2:15 PM",
    department: null,
    aiSummary:
      "No answer. Voicemail was not left. AI queued a callback task for business hours.",
    sentiment: "neutral",
    intent: "Unknown",
  },
  {
    id: "c6",
    phoneNumber: "+1 555 312 8873",
    callerName: "Priya Patel",
    duration: "01:55",
    status: "active",
    timestamp: "2:44 PM",
    department: "Onboarding",
    aiSummary:
      "New customer requesting onboarding walkthrough. AI collected setup preferences and scheduled a demo with the success team.",
    sentiment: "positive",
    intent: "Onboarding request",
  },
];

export default function CallGrid({ calls = SAMPLE_CALLS }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {calls.map((call) => (
        <CallCard key={call.id} call={call} />
      ))}
    </div>
  );
}
