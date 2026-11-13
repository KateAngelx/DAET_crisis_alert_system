import test from "node:test";
import assert from "node:assert/strict";
import { parseMapCoordinates } from "../src/lib/geocodeLocation.js";

test("missing alert coordinates are not treated as the Gulf of Guinea", () => {
  assert.equal(parseMapCoordinates(null, null), null);
  assert.equal(parseMapCoordinates(undefined, undefined), null);
  assert.equal(parseMapCoordinates("", ""), null);
  assert.equal(parseMapCoordinates(" ", " "), null);
});

test("valid map coordinates are parsed and geographic bounds are enforced", () => {
  assert.deepEqual(parseMapCoordinates("14.1122", "122.9553"), [14.1122, 122.9553]);
  assert.deepEqual(parseMapCoordinates(0, 0), [0, 0]);
  assert.equal(parseMapCoordinates(91, 122), null);
  assert.equal(parseMapCoordinates(14, 181), null);
});
