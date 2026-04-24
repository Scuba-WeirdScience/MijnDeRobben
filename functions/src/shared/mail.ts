import * as https from 'https';

const PROJECT_API_KEY = 'AIzaSyDke-bXspZwk_Q1BqDSLh8vyj7xVhu4MyA';

/**
 * Sends a password reset / account setup email via Firebase Auth REST API.
 * Firebase handles delivery — no external email provider needed.
 */
export function sendPasswordResetEmail(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ requestType: 'PASSWORD_RESET', email });
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:sendOobCode?key=${PROJECT_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Firebase Auth email fout ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
