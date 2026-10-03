import { describe, expect, it, vi } from "vitest";
import { decideRoleRequest, type DecisionDeps, type PendingRequest } from "./role-requests";

const USER = "00000000-0000-4000-8000-0000000000a1";
const pending: PendingRequest = {
  user_id: USER,
  obecna_rola: "mieszkaniec",
  wnioskowana_rola: "jst",
  nazwa_wyswietlana: "GOPS w Przykładowej Woli",
};

function fakeDeps(request: PendingRequest | null = pending, writeError: unknown = null) {
  const deps = {
    getRequest: vi.fn(async () => request),
    approve: vi.fn(async () => ({ error: writeError })),
    reject: vi.fn(async () => ({ error: writeError })),
    audit: vi.fn(async () => 1),
    notifyUser: vi.fn(async () => 1),
  } satisfies DecisionDeps;
  return deps;
}

describe("ROPS decides on a role request", () => {
  it("rops_admin approves: the requested role is set, logged and the user is told", async () => {
    const deps = fakeDeps();
    const r = await decideRoleRequest(deps, "rops_admin", { user_id: USER, zatwierdz: true });
    expect(r.ok).toBe(true);
    expect(deps.approve).toHaveBeenCalledWith(USER, "jst");
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "profil.rola.zatwierdzona", obiekt: `profiles:${USER}` }),
    );
    expect(deps.notifyUser).toHaveBeenCalledWith(USER, expect.stringContaining("zatwierdził"));
  });

  it("a rejection only clears the request and explains it to the user", async () => {
    const deps = fakeDeps();
    const r = await decideRoleRequest(deps, "rops_redaktor", { user_id: USER, zatwierdz: false });
    expect(r.ok).toBe(true);
    expect(deps.reject).toHaveBeenCalledWith(USER);
    expect(deps.approve).not.toHaveBeenCalled();
    expect(deps.notifyUser).toHaveBeenCalledWith(USER, expect.stringContaining("nie zatwierdził"));
  });

  it("only rops_admin may approve, like the database guard", async () => {
    const deps = fakeDeps();
    const r = await decideRoleRequest(deps, "rops_redaktor", { user_id: USER, zatwierdz: true });
    expect(r).toEqual({ ok: false, message: expect.stringContaining("administrator") });
    expect(deps.approve).not.toHaveBeenCalled();
  });

  it.each(["mieszkaniec", "ngo", "jst", "ekspert"] as const)("%s cannot decide", async (role) => {
    const deps = fakeDeps();
    expect((await decideRoleRequest(deps, role, { user_id: USER, zatwierdz: true })).ok).toBe(
      false,
    );
    expect(deps.getRequest).not.toHaveBeenCalled();
  });

  it("an already handled request and bad input are refused", async () => {
    expect(
      (await decideRoleRequest(fakeDeps(null), "rops_admin", { user_id: USER, zatwierdz: true }))
        .ok,
    ).toBe(false);
    expect((await decideRoleRequest(fakeDeps(), "rops_admin", { user_id: "x" })).ok).toBe(false);
  });

  it("a failed write is reported and nothing is logged", async () => {
    const deps = fakeDeps(pending, { message: "denied" });
    const r = await decideRoleRequest(deps, "rops_admin", { user_id: USER, zatwierdz: true });
    expect(r.ok).toBe(false);
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("a failing notification does not undo the decision", async () => {
    const deps = fakeDeps();
    deps.notifyUser.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await decideRoleRequest(deps, "rops_admin", { user_id: USER, zatwierdz: true })).ok,
    ).toBe(true);
  });
});
