import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function getLogoFromR2(symbol: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  try {
    const res = await R2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: `logos/${symbol.toUpperCase()}`,
    }));
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType || "image/png",
    };
  } catch {
    return null;
  }
}

export async function uploadLogoToR2(symbol: string, buffer: Buffer, contentType: string) {
  const key = `logos/${symbol.toUpperCase()}`;
  console.log(`[R2 Upload] Uploading ${key} (${buffer.length} bytes, ${contentType}) to bucket "${BUCKET}"`);
  await R2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  console.log(`[R2 Upload] Success: ${key}`);
}
