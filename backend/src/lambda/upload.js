const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const BUCKET_NAME = process.env.BUCKET_NAME;
const s3 = new S3Client({});

async function handler(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = JSON.parse(event.body || "{}");
    const contentType = body.contentType || "image/jpeg";
    const ext = contentType === "image/png" ? "png" : "jpg";
    const key = `uploads/${randomUUID()}.${ext}`;

    // Generate presigned PUT URL for the extension to upload directly
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: 300 });

    // Generate presigned GET URL (public-readable for 1 hour)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const publicUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadUrl, publicUrl, key }),
    };
  } catch (err) {
    console.error("Upload URL error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to generate upload URL" }),
    };
  }
}

module.exports = { handler };
