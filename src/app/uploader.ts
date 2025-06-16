onmessage = async (e: MessageEvent<File[]>) => {
  console.log("Message received from main script", e.data);
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