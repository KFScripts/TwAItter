const assert = require('node:assert/strict');
const { SafeUrlFetcher } = require('../dist/services/safeUrlFetcher');

async function expectRejected(url) {
  await assert.rejects(() => SafeUrlFetcher.validateUrl(url));
}

(async () => {
  await expectRejected('file:///etc/passwd');
  await expectRejected('ftp://example.com/file.txt');
  await expectRejected('http://127.0.0.1/private');
  await expectRejected('http://10.0.0.5/admin');
  await expectRejected('http://169.254.169.254/latest/meta-data');
  await expectRejected('http://[::1]/private');
  await expectRejected('http://[fc00::1]/private');
  await expectRejected('https://user:secret@example.com/private');
  await expectRejected('https://example.com:8443/internal');

  const publicUrl = await SafeUrlFetcher.validateUrl('https://8.8.8.8/reference');
  assert.equal(publicUrl.hostname, '8.8.8.8');

  console.log('agent sources: 10 controlli URL superati');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
