const UPLOAD_URL = "https://cornis-proxy-service.cornis.fr/upload_presigned_url/drone_app/cornis-drone-jsons/"

export async function POST(request: Request) {
    const content = await request.json()
    console.log("Received content", content)
    const token = content.auth_token

    // Get presigned URL
    const resp = await fetch(`${UPLOAD_URL}/android/dronoblade-data/test.jpg?token=${token}`)
    console.log(resp, await resp.json())

    return Response.json({ message: 'Hello World' })
}