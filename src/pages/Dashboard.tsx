import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { usePoll } from "../hooks/usePoll";

interface Agent {
  id: string;
  name: string;
  monocloud_client_id: string;
  created_at: string;
}

interface Policy {
  id: string;
  agent_id: string;
  allowed_endpoints: string[];
  allowed_methods: string[];
  time_window_start: string | null;
  time_window_end: string | null;
  allowed_days: string[];
}

interface ConsentRequest {
  id: string;
  scope: string;
  status: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  agent_id: string | null;
  endpoint: string;
  method: string;
  action: string;
  timestamp: string;
  consent_required: boolean;
  consent_given: boolean | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  allowed: { label: "Allowed", color: "text-green-600" },
  allowed_no_policy: { label: "Allowed (no policy set)", color: "text-yellow-600" },
  rejected_endpoint: { label: "Blocked — endpoint not permitted", color: "text-red-600" },
  rejected_method: { label: "Blocked — method not permitted", color: "text-red-600" },
  rejected_time_window: { label: "Blocked — outside allowed hours", color: "text-red-600" },
  rejected_day: { label: "Blocked — day not permitted", color: "text-red-600" },
  rejected_no_policy: { label: "Blocked — no policy set", color: "text-red-600" },
  rejected_scope: { label: "Blocked — scope not granted", color: "text-red-600" },
  rejected_consent: { label: "Blocked — consent invalid, used or expired", color: "text-red-600" },
  consent_requested: { label: "Consent requested", color: "text-purple-600" },
  consent_approved: { label: "Consent approved", color: "text-green-600" },
  consent_denied: { label: "Consent denied", color: "text-red-600" },
  consent_expired: { label: "Consent expired", color: "text-gray-500" },
  token_issued: { label: "Token issued", color: "text-blue-600" },
  token_issued_with_consent: { label: "Token issued (with consent)", color: "text-blue-600" },
};

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? { label: action, color: "text-gray-600" };
}

function consentStatus(given: boolean | null) {
  if (given === true) return "given";
  if (given === false) return "not given";
  return "requested";
}

// FastAPI returns validation problems as {detail: [{msg}, ...]}, other errors as {detail: "..."}
async function describeError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body.detail)) {
      return body.detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, "")).join("; ");
    }
    if (typeof body.detail === "string") return body.detail;
  } catch {
    /* fall through */
  }
  return `Request failed (${res.status})`;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingConsent, setPendingConsent] = useState<ConsentRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentClientId, setNewAgentClientId] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [policy, setPolicy] = useState<Partial<Policy>>({});
  const [policyError, setPolicyError] = useState<string | null>(null);

  const fetchAgents = async () => {
    const res = await apiFetch("/api/agents");
    if (res.ok) setAgents(await res.json());
  };

  const fetchAudit = async () => {
    const res = await apiFetch("/api/audit");
    if (res.ok) setAuditLogs(await res.json());
  };

  const fetchPending = async () => {
    const res = await apiFetch("/consent/pending");
    if (res.ok) setPendingConsent(await res.json());
  };

  useEffect(() => {
    fetchAgents();
    fetchAudit();
  }, []);

  // Poll consent requests and audit log every 4 seconds
  usePoll(fetchPending, 4000);
  usePoll(fetchAudit, 4000);

  const createAgent = async () => {
    if (!newAgentName || !newAgentClientId) return;
    const res = await apiFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: newAgentName, monocloud_client_id: newAgentClientId }),
    });
    if (res.ok) {
      setNewAgentName("");
      setNewAgentClientId("");
      fetchAgents();
    }
  };

  const deleteAgent = async (id: string) => {
    await apiFetch(`/api/agents/${id}`, { method: "DELETE" });
    fetchAgents();
  };

  const loadPolicy = async (agent: Agent) => {
    setSelectedAgent(agent);
    setPolicyError(null);
    const res = await apiFetch(`/api/policies/${agent.id}`);
    if (res.ok) {
      setPolicy(await res.json());
    } else {
      setPolicy({ agent_id: agent.id, allowed_endpoints: [], allowed_methods: [], allowed_days: [] });
    }
  };

  const savePolicy = async () => {
    if (!selectedAgent) return;
    setPolicyError(null);
    const res = await apiFetch(`/api/policies/${selectedAgent.id}`, {
      method: "PUT",
      body: JSON.stringify({
        allowed_endpoints: policy.allowed_endpoints ?? [],
        allowed_methods: policy.allowed_methods ?? [],
        allowed_days: policy.allowed_days ?? [],
        time_window_start: policy.time_window_start || null,
        time_window_end: policy.time_window_end || null,
      }),
    });
    if (!res.ok) {
      setPolicyError(await describeError(res));
      return;
    }
    setSelectedAgent(null);
  };

  const resolveConsent = async (id: string, approved: boolean) => {
    await apiFetch("/consent/approve", {
      method: "POST",
      body: JSON.stringify({ consent_id: id, approved }),
    });
    fetchPending();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">

      {/* Agents */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Agents</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="border rounded px-3 py-1.5 flex-1"
            placeholder="Agent name"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-1.5 flex-1"
            placeholder="MonoCloud client ID"
            value={newAgentClientId}
            onChange={(e) => setNewAgentClientId(e.target.value)}
          />
          <button
            onClick={createAgent}
            className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <ul className="divide-y border rounded">
          {agents.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-gray-500">{a.monocloud_client_id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadPolicy(a)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Policy
                </button>
                <button
                  onClick={() => deleteAgent(a.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {agents.length === 0 && (
            <li className="px-4 py-3 text-gray-400 text-sm">No agents yet.</li>
          )}
        </ul>
      </section>

      {/* Policy editor */}
      {selectedAgent && (
        <section className="border rounded p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-1">Policy for {selectedAgent.name}</h2>
          <p className="text-xs text-gray-500 mb-3">
            An agent with no policy is blocked. Leave a field empty for no restriction on it. Endpoints can end
            with * to match a prefix (e.g. /api/orders/*). Times are IST; a window like 22:00–06:00 crosses midnight.
          </p>
          {policyError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
              {policyError}
            </p>
          )}
          <div className="space-y-3">
            <label className="block text-sm">
              Allowed endpoints (comma-separated)
              <input
                className="border rounded px-3 py-1.5 w-full mt-1"
                value={(policy.allowed_endpoints ?? []).join(", ")}
                onChange={(e) =>
                  setPolicy({ ...policy, allowed_endpoints: e.target.value.split(",").map((s) => s.trim()) })
                }
              />
            </label>
            <label className="block text-sm">
              Allowed methods (comma-separated, e.g. GET, POST)
              <input
                className="border rounded px-3 py-1.5 w-full mt-1"
                value={(policy.allowed_methods ?? []).join(", ")}
                onChange={(e) =>
                  setPolicy({ ...policy, allowed_methods: e.target.value.split(",").map((s) => s.trim()) })
                }
              />
            </label>
            <label className="block text-sm">
              Allowed days (comma-separated, e.g. monday,tuesday)
              <input
                className="border rounded px-3 py-1.5 w-full mt-1"
                value={(policy.allowed_days ?? []).join(", ")}
                onChange={(e) =>
                  setPolicy({ ...policy, allowed_days: e.target.value.split(",").map((s) => s.trim()) })
                }
              />
            </label>
            <div className="flex gap-2 text-sm">
              <label className="block">
                Time window start (IST)
                <input
                  type="time"
                  className="border rounded px-3 py-1.5 w-full mt-1"
                  value={policy.time_window_start ?? ""}
                  onChange={(e) => setPolicy({ ...policy, time_window_start: e.target.value || null })}
                />
              </label>
              <label className="block">
                Time window end (IST)
                <input
                  type="time"
                  className="border rounded px-3 py-1.5 w-full mt-1"
                  value={policy.time_window_end ?? ""}
                  onChange={(e) => setPolicy({ ...policy, time_window_end: e.target.value || null })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={savePolicy} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 text-sm">
                Save
              </button>
              <button onClick={() => setSelectedAgent(null)} className="text-sm text-gray-500 hover:underline">
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Pending consent requests */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          Pending Consent{" "}
          {pendingConsent.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingConsent.length}
            </span>
          )}
        </h2>
        <ul className="divide-y border rounded">
          {pendingConsent.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{c.scope}</p>
                <p className="text-sm text-gray-500">
                  Requested {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolveConsent(c.id, true)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => resolveConsent(c.id, false)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Deny
                </button>
              </div>
            </li>
          ))}
          {pendingConsent.length === 0 && (
            <li className="px-4 py-3 text-gray-400 text-sm">No pending requests.</li>
          )}
        </ul>
      </section>

      {/* Audit log */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Audit Log</h2>
        <ul className="divide-y border rounded">
          {auditLogs.map((log) => {
            const { label, color } = formatAction(log.action);
            const agentName = agents.find((a) => a.id === log.agent_id)?.name ?? "Unknown agent";
            return (
              <li key={log.id} className="px-4 py-3 flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${color}`}>{label}</span>
                  <span className="font-mono text-gray-700">{log.method} {log.endpoint}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {agentName} · {new Date(log.timestamp).toLocaleString()}
                  {log.consent_required && (
                    <span className="ml-2 text-purple-500">
                      · consent {consentStatus(log.consent_given)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {auditLogs.length === 0 && (
            <li className="px-4 py-3 text-gray-400 text-sm">No activity yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
