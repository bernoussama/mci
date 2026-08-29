import {
  DiscoveryResponseSchema,
  type DiscoveryResponse,
  type DiscoveryTurn,
} from "../../shared/discovery-schema";

export async function assessBusinessDiscovery(turns: DiscoveryTurn[]): Promise<DiscoveryResponse> {
  const response = await fetch("/api/discovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ turns }),
  });

  const body: unknown = await response.json();
  if (!response.ok) throw new Error("The discovery agent could not assess this answer.");
  return DiscoveryResponseSchema.parse(body);
}
