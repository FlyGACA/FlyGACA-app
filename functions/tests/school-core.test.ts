import { describe, expect, it } from "vitest";
import {
  schoolEntitlement,
  parseSeatEmails,
  inviteKeyForEmail,
  isApprovedSchoolDomain,
} from "../src/school-core.js";

describe("schoolEntitlement", () => {
  it("is a non-expiring school grant tagged as school", () => {
    expect(schoolEntitlement()).toEqual({ plan: "school", source: "school" });
    expect(schoolEntitlement().expiresAt).toBeUndefined();
  });

  it("carries a contract-end expiry when given one", () => {
    const iso = "2027-06-30T23:59:59.000Z";
    expect(schoolEntitlement(iso)).toEqual({
      plan: "school",
      source: "school",
      expiresAt: iso,
    });
  });
});

describe("parseSeatEmails", () => {
  it("parses a newline roster, lowercasing and trimming", () => {
    expect(parseSeatEmails("Alice@School.edu\n  bob@school.edu \n")).toEqual([
      "alice@school.edu",
      "bob@school.edu",
    ]);
  });

  it("splits on commas, semicolons and whitespace", () => {
    expect(parseSeatEmails("a@x.com, b@x.com; c@x.com d@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
      "d@x.com",
    ]);
  });

  it("ignores a leading 'email' header, blanks and non-emails", () => {
    expect(parseSeatEmails("email\n\nreal@x.com\nnot-an-email\n@nope.com\nfoo@bar")).toEqual([
      "real@x.com",
    ]);
  });

  it("de-duplicates case-insensitively", () => {
    expect(parseSeatEmails("dup@x.com\nDUP@x.com\ndup@x.com")).toEqual(["dup@x.com"]);
  });

  it("returns an empty list for empty or junk input", () => {
    expect(parseSeatEmails("")).toEqual([]);
    expect(parseSeatEmails("   \n , ; ")).toEqual([]);
  });
});

describe("inviteKeyForEmail", () => {
  it("normalizes to a trimmed, lowercased key", () => {
    expect(inviteKeyForEmail("  Alice@School.EDU ")).toBe("alice@school.edu");
  });

  it("is null for non-emails and blanks", () => {
    expect(inviteKeyForEmail("not-an-email")).toBeNull();
    expect(inviteKeyForEmail("foo@bar")).toBeNull();
    expect(inviteKeyForEmail("")).toBeNull();
    expect(inviteKeyForEmail(undefined)).toBeNull();
    expect(inviteKeyForEmail(null)).toBeNull();
  });

  it("agrees with parseSeatEmails on the same address", () => {
    const [parsed] = parseSeatEmails("Capt.Sara@academy.edu.sa");
    expect(inviteKeyForEmail("Capt.Sara@academy.edu.sa")).toBe(parsed);
  });
});

describe("isApprovedSchoolDomain", () => {
  const domains = ["academy.edu.sa"];

  it("grants a verified email on an approved domain", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", true, domains)).toBe(true);
    expect(isApprovedSchoolDomain("Cadet@Academy.EDU.SA", true, domains)).toBe(true);
  });

  it("never grants an unverified email, even on an approved domain", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", false, domains)).toBe(false);
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", undefined, domains)).toBe(false);
  });

  it("rejects other domains and malformed input", () => {
    expect(isApprovedSchoolDomain("cadet@gmail.com", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain("no-at-sign", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain("", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain(null, true, domains)).toBe(false);
  });

  it("defaults to the empty allowlist — nothing auto-grants until configured", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", true)).toBe(false);
  });
});
