export async function buildImageDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
