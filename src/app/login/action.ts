'use server'

export async function login(email: string, password: string) {
  console.log("Email:", email);

  const AUTH_URL = "https://auth-backend2.cornis.fr/authenticate_with_session"

  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": "nczkVbAmDCNCbGWdhkpDzMdFUCDM7nLtsTrZLsbxpmPXFyaDzin"
    },
    body: JSON.stringify({
      email: email,
      password: password
    })
  });
  console.log("Resp", resp);
  const session = await resp.json();
  return session.auth_token;
}