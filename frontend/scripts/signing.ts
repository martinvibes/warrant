/**
 * Proves the browser signing path and the server verification path agree.
 * This is the one place where a mismatch would be invisible until demo day:
 * the field order, the domain and the string-vs-bigint encoding all have to
 * line up exactly, and nothing in either type system enforces that they do.
 */
import { localSigner, toAtomic } from '../src/lib/owner';

export async function run() {
  const API = 'http://localhost:8090';
  // A throwaway key. The point is the signature, not the identity.
  const signer = localSigner(process.env.OWNER_PRIVATE_KEY as string);
  console.log('  signing as       ', signer.address);

  const health = await (await fetch(`${API}/health`)).json();
  const signed = await signer.signWarrant(
    {
      agent: '0.0.7777',
      asset: health.asset,
      cap: toAtomic('3.25', health.assetDecimals),
      resources: ['inference'],
      purpose: 'browser-signed warrant',
      expiry: Math.floor(Date.now() / 1000) + 3600,
    },
    health.network
  );
  console.log('  cap atomic       ', signed.warrant.cap);

  const res = await fetch(`${API}/v1/warrants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(signed),
  });
  const body: any = await res.json();
  if (res.status !== 201) {
    console.log(`  FAIL register     ${res.status} ${JSON.stringify(body)}`);
    return 1;
  }
  console.log('  server accepted  ', body.warrant.id);
  console.log('  owner recorded   ', body.warrant.owner);

  if (body.warrant.owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log('  FAIL the server recovered a different owner than signed');
    return 1;
  }

  // And the revocation path, which is a different typed struct.
  const { revocation, signature } = await signer.signRevocation(body.warrant.id, health.network);
  const rev = await fetch(`${API}/v1/warrants/${body.warrant.id}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revocation, signature }),
  });
  const revBody: any = await rev.json();
  if (rev.status !== 200 || !revBody.revoked) {
    console.log(`  FAIL revoke       ${rev.status} ${JSON.stringify(revBody)}`);
    return 1;
  }
  console.log('  revoked          ', revBody.warrant.status);
  console.log('\nBROWSER SIGNING AND SERVER VERIFICATION AGREE');
  return 0;
}

process.exitCode = await run();
