import { describe, expect, it, vi } from "vitest";
import { requestProblem, submitRoleRequest, type RoleRequestDeps } from "./role-request";

function fakeDeps(error: unknown = null) {
  return {
    saveRequest: vi.fn(async () => ({ error })),
    notifyRops: vi.fn(async () => 1),
  } satisfies RoleRequestDeps;
}

describe("role request from the profile", () => {
  it("saves the request and notifies ROPS", async () => {
    const deps = fakeDeps();
    const state = await submitRoleRequest(deps, "mieszkaniec", "Ewa", "ngo");
    expect(state).toEqual({ status: "sent", role: "ngo" });
    expect(deps.saveRequest).toHaveBeenCalledWith("ngo");
    expect(deps.notifyRops).toHaveBeenCalledWith(
      expect.stringContaining("Organizacja pozarządowa"),
    );
  });

  it("refuses roles that can't be requested, e.g. ROPS roles", async () => {
    const deps = fakeDeps();
    expect((await submitRoleRequest(deps, "mieszkaniec", "Ewa", "rops_admin")).status).toBe(
      "error",
    );
    expect((await submitRoleRequest(deps, "mieszkaniec", "Ewa", undefined)).status).toBe("error");
    expect(deps.saveRequest).not.toHaveBeenCalled();
  });

  it("no request for a role you already have, nor from a ROPS account", () => {
    expect(requestProblem("ngo", "ngo")).toMatch(/już/);
    expect(requestProblem("rops_admin", "jst")).toMatch(/ROPS/);
    expect(requestProblem("mieszkaniec", "jst")).toBeNull();
  });

  it("a failed save is reported and ROPS is not notified", async () => {
    const deps = fakeDeps({ message: "denied" });
    expect((await submitRoleRequest(deps, "mieszkaniec", "Ewa", "jst")).status).toBe("error");
    expect(deps.notifyRops).not.toHaveBeenCalled();
  });

  it("a failing notification still keeps the saved request", async () => {
    const deps = fakeDeps();
    deps.notifyRops.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await submitRoleRequest(deps, "mieszkaniec", "Ewa", "jst")).status).toBe("sent");
  });
});
