//import { S3Client, ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { openDB, getFromStore, Credentials, UploadData, sleep } from "./utils";


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

    await uploadAll(e.data.files, credentials, e.data.name)
};


async function uploadAll(files: File[], credentials: Credentials, prefix: string) {
    // Empty
    if (!files.length) {
        postMessage(1)
        return
    }

    let uploaded = 0
    files.forEach(async (f) => {
        await upload(f, credentials, prefix)
        // await sleep(10000);
        console.log("Uploaded", f);
        uploaded += 1
        postMessage(100 * uploaded / files.length)
    })
}

async function upload(file: File, credentials: Credentials, prefix: string) {
    const reader = new FileReader()
    const url = new URL("/upload", location.origin)
    url.searchParams.append("path", `${prefix}/${file.webkitRelativePath}`)
    url.searchParams.append("accessKeyId", credentials.accessKeyId)
    url.searchParams.append("secretAccessKey", credentials.secretAccessKey)

    const resp = await fetch(url, {
        method: "POST",
        body: file
    })
    console.log("Resp", resp);
}