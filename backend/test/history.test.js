const { buildResponse } = require("../src/lambda/history");

describe("buildResponse", () => {
  it("returns correct status and headers", () => {
    const res = buildResponse(200, { message: "ok" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(JSON.parse(res.body)).toEqual({ message: "ok" });
  });
});
