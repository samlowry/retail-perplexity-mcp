export interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
}

export function checkNodeVersion(): CheckResult {
  const major = Number(process.versions.node.split(".")[0]);
  const ok = major >= 20;
  return {
    name: "node_version",
    ok,
    message: ok ? `Node ${process.versions.node}` : `Node ${process.versions.node} (need >=20)`,
  };
}
