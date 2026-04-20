const visa = require("../index.cjs");

describe("visa.js ask", () => {
  beforeEach(() => visa.reset());

  describe("Errors", () => {
    describe("Rule returns error", () => {
      it("should catch error and enhance with details", async () => {
        visa.policy({
          objects: {
            account: {
              operations: {
                open: () => {
                  throw new Error("Some rule error");
                },
              },
            },
          },
        });
        await expect(visa.ask().can.open.account()).rejects.toThrow(
          `visa.js: object 'account' operation 'open': rule failed with error: Some rule error`,
        );
      });
    });
  });
  describe("Rule returns true", () => {
    it("should be authorized", async () => {
      visa.policy({
        objects: {
          account: {
            operations: {
              open: (subject) => subject.role === "teller",
            },
          },
        },
      });
      const subject = { role: "teller" };
      const answer = await visa.ask(subject).can.open.account();
      expect(answer).toBe(true);
    });
  });
  describe("Rule returns false", () => {
    it("should NOT be authorized", async () => {
      visa.policy({
        objects: {
          account: {
            operations: {
              open: (subject) => subject.role === "teller",
            },
          },
        },
      });
      const subject = { role: "manager" };
      const answer = await visa.ask(subject).can.open.account();
      expect(answer).toBe(false);
    });
  });
  describe("can.not", () => {
    describe("Rule fails", () => {
      it("should return true", async () => {
        visa.policy({
          objects: {
            account: {
              operations: {
                open: () => false,
              },
            },
          },
        });
        const answer = await visa.ask().can.not.open.account();
        expect(answer).toBe(true);
      });
    });
    describe("Rule passes", () => {
      it("should return false", async () => {
        visa.policy({
          objects: {
            account: {
              operations: {
                open: () => true,
              },
            },
          },
        });
        const answer = await visa.ask().can.not.open.account();
        expect(answer).toBe(false);
      });
    });
  });
});
