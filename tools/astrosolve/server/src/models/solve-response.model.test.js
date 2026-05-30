import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SolveSuccessResponse,
  SolveErrorResponse,
} from "./solve-response.model.js";

describe("SolveSuccessResponse", () => {
  it("serialises to the API contract { code, message, details }", () => {
    const metadata = { ra: 1, dec: 2, scale: 0.001, wcs: "...", radius_searched: 2 };
    const objects = [{ name: "Sirius", type: "*" }];
    const resp = new SolveSuccessResponse(metadata, objects);

    const json = JSON.parse(JSON.stringify(resp));
    assert.equal(json.code, "SOLVE_SUCCESS");
    assert.equal(json.message, "Plate solve completed successfully.");
    assert.deepEqual(json.details.metadata, metadata);
    assert.deepEqual(json.details.objects, objects);
    assert.equal(Object.prototype.hasOwnProperty.call(json.details, "warnings"), false);
  });

  it("includes warnings in details only when non-empty", () => {
    const metadata = { ra: 1, dec: 2 };
    const respWithWarn = new SolveSuccessResponse(metadata, [], ["SIMBAD unavailable"]);
    const json = JSON.parse(JSON.stringify(respWithWarn));
    assert.deepEqual(json.details.warnings, ["SIMBAD unavailable"]);

    const respEmpty = new SolveSuccessResponse(metadata, [], []);
    const jsonEmpty = JSON.parse(JSON.stringify(respEmpty));
    assert.equal(
      Object.prototype.hasOwnProperty.call(jsonEmpty.details, "warnings"),
      false,
    );
  });
});

describe("SolveErrorResponse", () => {
  it("serialises to the API contract with empty details", () => {
    const resp = new SolveErrorResponse("VALIDATION_ERROR", "Image too small");
    const json = JSON.parse(JSON.stringify(resp));
    assert.deepEqual(json, {
      code: "VALIDATION_ERROR",
      message: "Image too small",
      details: {},
    });
  });

  it("preserves arbitrary code values (SERVER_BUSY, SOLVE_FAILED, ...)", () => {
    const codes = ["SERVER_BUSY", "SOLVE_FAILED", "UNAUTHORIZED"];
    for (const code of codes) {
      const json = JSON.parse(JSON.stringify(new SolveErrorResponse(code, "msg")));
      assert.equal(json.code, code);
      assert.deepEqual(json.details, {});
    }
  });
});
