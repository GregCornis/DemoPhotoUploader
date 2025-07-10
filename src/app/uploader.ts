import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { openDB } from "./utils";


let auth_token: string|null = null

async function getAuthToken(): Promise<string> {
    console.log("Getting token", auth_token)
    if (auth_token != null) return auth_token;
    
    const db = await openDB();
    const tx = db.transaction("auth", "readonly");
    const store = tx.objectStore("auth");
    const getRequest = store.get("auth_token");
    const token = await new Promise<string>((resolve, reject) => {
      getRequest.onsuccess = (res) => resolve(getRequest.result);
      getRequest.onerror = (err) => reject(err);
    });
    console.log("Read from DB", token);

    // Store locally (not very thread-safe)
    auth_token = token;

    return token;
}


onmessage = async (e: MessageEvent<File[]>) => {
  console.log("Message received from main script", e.data)

//   await testS3();
    const token = await getAuthToken()
    
    const resp = await fetch(`${location.origin}/upload`, {
        method: "POST",
        body: JSON.stringify({auth_token: token})
    })
    console.log("Resp", resp);

    await uploadAll(e.data)
};


async function uploadAll(files: File[]) {
    // Empty
    if (!files.length) {
        postMessage(1);
        return;
    }

    let uploaded = 0;
    files.forEach(async (f) => {
        await upload(f);
        uploaded += 1;
        postMessage(100 * (uploaded + 1) / files.length);
    })
}

async function upload(file: File) {
    console.log("Uploading", file);
    await sleep(1000);
}

async function sleep(milliSeconds: number) {
    return new Promise((resolve) =>setTimeout(resolve, milliSeconds));
}