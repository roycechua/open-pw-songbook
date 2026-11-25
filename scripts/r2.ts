import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { required } from './load-env'

export function createR2Client() {
  const accountId = required('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
  })
}

export function r2Bucket() {
  return required('R2_BUCKET')
}

export async function putObject(
  client: S3Client,
  key: string,
  body: string | Uint8Array,
  contentType: string,
) {
  await client.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function getObjectText(client: S3Client, key: string): Promise<string> {
  const result = await client.send(
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
    }),
  )
  if (!result.Body) throw new Error(`Empty object: ${key}`)
  return new TextDecoder().decode(await result.Body.transformToByteArray())
}
