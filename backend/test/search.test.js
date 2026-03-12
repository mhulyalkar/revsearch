const { fanOutSearch } = require("../src/lambda/search");

describe("fanOutSearch", () => {
  it("returns results from multiple engines", async () => {
    const results = await fanOutSearch("https://example.com/image.jpg");
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result).toHaveProperty("engine");
    });
  });

  it("handles individual engine failures gracefully", async () => {
    const results = await fanOutSearch("https://invalid-url-test.example/nothing.jpg");
    expect(Array.isArray(results)).toBe(true);
  });
});
