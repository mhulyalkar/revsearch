const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { randomUUID } = require("crypto");

const TABLE_NAME = process.env.TABLE_NAME;
const ddb = new DynamoDBClient({});

async function searchGoogle(imageUrl) {
  return {
    engine: "google",
    searchUrl: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
    results: []
  };
}

async function searchBing(imageUrl) {
  return {
    engine: "bing",
    searchUrl: `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`,
    results: []
  };
}

async function searchYandex(imageUrl) {
  return {
    engine: "yandex",
    searchUrl: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
    results: []
  };
}

async function searchTinEye(imageUrl) {
  return {
    engine: "tineye",
    searchUrl: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`,
    results: []
  };
}

async function fanOutSearch(imageUrl) {
  const engines = [searchGoogle, searchBing, searchYandex, searchTinEye];

  const results = await Promise.allSettled(engines.map(fn => fn(imageUrl)));

  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
}

async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { imageUrl, userId } = body;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "imageUrl is required" }),
      };
    }

    const engineResults = await fanOutSearch(imageUrl);

    // Save to history if user is authenticated
    if (userId && TABLE_NAME) {
      const searchId = randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await ddb.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          userId: { S: userId },
          searchId: { S: searchId },
          imageUrl: { S: imageUrl },
          results: { S: JSON.stringify(engineResults) },
          createdAt: { N: String(now) },
          ttl: { N: String(now + 90 * 24 * 60 * 60) },
        },
      }));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        imageUrl,
        engines: engineResults,
      }),
    };
  } catch (err) {
    console.error("Search error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

module.exports = { handler, fanOutSearch };
