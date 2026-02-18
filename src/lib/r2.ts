import { AwsClient } from "aws4fetch";

let _r2: AwsClient | null = null;

function getR2Client() {
  if (!_r2) {
    _r2 = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    });
  }
  return _r2;
}

function getR2Url() {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}`;
}

export async function getLogoFromR2(symbol: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  try {
    const res = await getR2Client().fetch(`${getR2Url()}/logos/${symbol.toUpperCase()}`);
    if (!res.ok) return null;
    return {
      body: res.body as ReadableStream,
      contentType: res.headers.get("content-type") || "image/png",
    };
  } catch {
    return null;
  }
}

export async function uploadLogoToR2(symbol: string, buffer: Buffer, contentType: string) {
  const key = `logos/${symbol.toUpperCase()}`;
  console.log(`[R2 Upload] Uploading ${key} (${buffer.length} bytes, ${contentType})`);
  const res = await getR2Client().fetch(`${getR2Url()}/${key}`, {
    method: "PUT",
    body: new Uint8Array(buffer),
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed: ${res.status} ${text}`);
  }
  console.log(`[R2 Upload] Success: ${key}`);
}
