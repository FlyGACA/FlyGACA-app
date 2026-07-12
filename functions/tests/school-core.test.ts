import { describe, expect, it } from "vitest";
import { schoolEntitlement, parseSeatEmails } from "../src/school-core.js";

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
