const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;
const ddb = new DynamoDBClient({});

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

async function getHistory(userId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": { S: userId } },
    ScanIndexForward: false,
    Limit: 50,
  }));

  return (result.Items || []).map(item => ({
    searchId: item.searchId.S,
    imageUrl: item.imageUrl.S,
    results: JSON.parse(item.results?.S || "[]"),
    createdAt: Number(item.createdAt.N),
  }));
}

async function deleteSearch(userId, searchId) {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLE_NAME,
    Key: {
      userId: { S: userId },
      searchId: { S: searchId },
    },
  }));
}

async function handler(event) {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return buildResponse(401, { error: "Unauthorized" });
    }

    if (event.httpMethod === "GET") {
      const history = await getHistory(userId);
      return buildResponse(200, { history });
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      if (!body.searchId) {
        return buildResponse(400, { error: "searchId is required" });
      }
      await deleteSearch(userId, body.searchId);
      return buildResponse(200, { message: "Deleted" });
    }

    return buildResponse(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("History error:", err);
    return buildResponse(500, { error: "Internal server error" });
  }
}

module.exports = { handler, buildResponse };
