import { GetObjectAttributesCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Credentials } from '../utils';

export async function POST(request: Request) {
    console.log("Received POST /upload")
    const content = await request.arrayBuffer()
    
    const url = new URL(request.url)
    const params = url.searchParams
    console.log("Request params", params)
    const path = params.get("path")
    if (path == null) {
        return new Response(null, {status: 400, statusText: "Missing 'path' parameter"})
    }
    const accessKeyId = params.get("accessKeyId")
    const secretAccessKey = params.get("secretAccessKey")
    if (accessKeyId == null || secretAccessKey == null) {
        return new Response(null, {status: 400, statusText: "Missing credentials parameter"})
    }

    await upload(content, path, {accessKeyId: accessKeyId, secretAccessKey: secretAccessKey})

    return Response.json({ message: 'OK' })
}


export async function upload(file: ArrayBuffer, path: string, credentials: Credentials) {
    const client = new S3Client({
        region: "us-east-1",
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey
        }
    })

    const resp = await client.send(new PutObjectCommand({
        Bucket: "cornis-drone-photos",
        Key: `test/${path}`,
        Body: new Uint8Array(file)
    }))
    console.log("Created file", resp)
}


export async function testS3() {
    const client = new S3Client({
        region: "us-east-1",
        credentials: {
            accessKeyId: "-",
            secretAccessKey: "-"
        }
    })
    const resp = await client.send(new ListObjectsV2Command({ Bucket: "cornis-drone-photos" }))
    console.log("AWS resp", resp);

    const att = await client.send(new GetObjectAttributesCommand({
        Bucket: "cornis-drone-photos",
        Key: "20250516-Engie-Sud/inspection_folder_id.json",
        ObjectAttributes: ["ETag", "Checksum", "ObjectParts", "StorageClass", "ObjectSize"]
    }))
    console.log("AWS att", att)
}

