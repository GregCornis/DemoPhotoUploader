import { GetObjectAttributesCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { openDB, getFromStore, Credentials, UploadData, sleep } from "./utils";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


let _credentials: Credentials | null = null

async function getCredentials(): Promise<Credentials> {
    console.log("Getting token", _credentials)
    if (_credentials != null) return _credentials;

    const db = await openDB();
    const tx = db.transaction("auth", "readonly");
    const store = tx.objectStore("auth");
    const accessKeyId = await getFromStore(store, "accessKeyId")
    const secretAccessKey = await getFromStore(store, "secretAccessKey")
    console.log("Read from DB", accessKeyId);

    // Store locally (not very thread-safe)
    _credentials = { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey };

    return _credentials;
}


onmessage = async (e: MessageEvent<UploadData>) => {
    console.log("Message received from main script", e.data)

    const credentials = await getCredentials()
    console.log("Credentials:", credentials);

    await uploadAll(e.data.files, credentials, e.data.name)
};


async function uploadAll(files: File[], credentials: Credentials, prefix: string) {
    // Empty
    if (!files.length) {
        postMessage(1)
        return
    }

    const client = new S3Client({
        region: "us-east-1",
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey
        }
    })

    let uploaded = 0
    files.forEach(async (f) => {
        await upload(f, prefix, client)
        // await sleep(10000);
        console.log("Uploaded", f);
        uploaded += 1
        postMessage(100 * uploaded / files.length)
    })
}


async function upload(file: File, prefix: string, client: S3Client) {
    console.log("Uploading", file.name);
    const path = encodeURI(`${prefix}/${file.webkitRelativePath}`);

    const command = new PutObjectCommand({
        Bucket: "cornis-drone-photos",
        Key: `test/${path}`
    })

    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    console.log("Presigned URL:", url)

    const resp = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
    })
    console.log("Created file", resp)
}

