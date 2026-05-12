import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';

const prodCred = JSON.parse(readFileSync('service-account.json', 'utf8'));

const auth = new GoogleAuth({
  credentials: prodCred,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/identitytoolkit'],
});
const client = await auth.getClient();
const tokenResp = await client.getAccessToken();
const token = tokenResp.token!;

// The hash config lives at the v2 tenant config endpoint
const urls = [
  'https://identitytoolkit.googleapis.com/admin/v2/projects/dcderobben-d3536/config',
  'https://identitytoolkit.googleapis.com/v1/projects/dcderobben-d3536',
];

for (const url of urls) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`\n${url}`);
  console.log('Status:', resp.status);
  const text = await resp.text();
  try {
    const json = JSON.parse(text);
    // print only top-level keys to find where hash lives
    console.log('Keys:', Object.keys(json));
    if (json.passwordHashConfig || json.hashConfig || json.signIn) {
      console.log(JSON.stringify(json, null, 2).slice(0, 1000));
    }
  } catch {
    console.log(text.slice(0, 300));
  }
}

process.exit(0);
