import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function read(relative: string): string {
  return readFileSync(resolve(root, relative), "utf8").replace(/\r\n/g, "\n");
}

describe("A9B B1B2 declarative IRIS bootstrap", () => {
  it("binds the frozen B0/B1A authorities and exact tracked source hashes", () => {
    const source = read("scripts/bootstrap-iris.ps1");

    for (const marker of [
      "2EC1D9AD5376F9895F81A076E93D0F2BCB087219F657C5491E9238645F10C18B",
      "7BA83D2AE06F7E27D7578CA35436B70B31B386D1C0ED2035B815DDD397CA7C40",
      "FD400F1F6CC3DF778C8A34E7BEF7FC55ADC3C060AD8FD61E544B3AE085025CC1",
      "B99BDE892570E51F3A1CA8BA14A77EF2E4EE13E9F9E7012E2875573C8B86962D",
      "7787320DBA20C9B996C2D3B7E4E6C19556338435EE78832724CAB454A3CB2E16",
      "41D04211838375D34D99F51329E492507B731D33A781F1BFF8DFB0C5A0B73B12",
      "DCCF7B3302F5E0CC42ECC256471214D6EA602880BF227D843D37FAF7308AE5D2",
      "F62A0676B65D5D4648996D5F39A76E5A23E1CDAD915F4918073C54A1C6F01999",
      "Meridian.Lab.Orders.REST",
      "function Test-ExactLine",
      "function Require-ExactLine",
      "MERIDIAN_BOOTSTRAP_API_TWO_PHASE_LOAD_COMPILE=PASS",
    ]) {
      expect(source).toContain(marker);
    }
  });

  it("owns only the frozen role/resource/application and SELECT-grant surface", () => {
    const source = read("scripts/bootstrap-iris.ps1");

    for (const marker of [
      "MeridianViewer",
      "MeridianJobRunner",
      "MeridianEmployee",
      "MeridianOperator",
      "MeridianSupervisor",
      "MeridianControlPlaneRuntime",
      "MeridianControlPlaneHelperExecution",
      "MeridianReceiptHistoryWriter",
      "MeridianSecurityMetadataReader",
      "MeridianTaskActionExecutor",
      "MeridianTaskMetadataReader",
      "MeridianSystemMetadataReader",
      "MeridianProcessActionExecutor",
      "%Admin_Task:U",
      "%Admin_Operate:U,%DB_IRISSYS:RW",
      "MeridianProcessActionExecutor,MeridianSecurityMetadataReader,MeridianSystemMetadataReader,MeridianTaskActionExecutor,MeridianTaskMetadataReader",
      "/meridian/api",
      "/meridian/admin",
      "/meridian-control-plane-internal",
      "/meridian-control-plane-history",
      "GRANT SELECT ON %SYS.ProcessQuery TO \"\"meridian.runtime\"\"",
      "GRANT SELECT ON %Library.SysLogTable TO MeridianControlPlaneRuntime",
    ]) {
      expect(source).toContain(marker);
    }

    expect(source).not.toContain("GRANT INSERT");
    expect(source).not.toContain("GRANT UPDATE");
    expect(source).not.toContain("GRANT DELETE");
    expect(source).not.toContain(
      "GRANT SELECT ON %SYS.ProcessQuery TO MeridianSystemMetadataReader",
    );
    expect(source).not.toContain("%All");
    expect(source).not.toContain("%Admin_Manage:U");
  });

  it("fails closed on existing drift and transports new-user passwords only in memory/stdin", () => {
    const source = read("scripts/bootstrap-iris.ps1");

    for (const marker of [
      "refused existing-object drift",
      "Read-Host",
      "-AsSecureString",
      "SecureStringToBSTR",
      "ZeroFreeBSTR",
      "MERIDIAN_BOOTSTRAP_PASSWORD_FILE_CREATED=NO",
      "MERIDIAN_BOOTSTRAP_PASSWORD_ENV_USED=NO",
      "MERIDIAN_BOOTSTRAP_PASSWORD_COMMANDLINE_USED=NO",
      "MERIDIAN_BOOTSTRAP_PASSWORD_STORED=NO",
      "MERIDIAN_BOOTSTRAP_HELPER_INSTALLER_REUSED=PASS",
      "MERIDIAN_BOOTSTRAP_RESULT=ALREADY_CONVERGED",
    ]) {
      expect(source).toContain(marker);
    }

    expect(source).not.toContain("C:\\Users\\HP\\intersystems-inspections");
    expect(source).not.toContain("s1a-native-sdk-venv");
  });
});
