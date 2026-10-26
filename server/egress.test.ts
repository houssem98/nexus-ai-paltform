import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeEgress } from './egress';

// L1 T12: every egress case in the attack list of docs/LOOP_CONVENTIONS.md is refused.
const dns: Record<string, string[]> = {
  'api.example.com': ['93.184.216.34'],
  'rebind.example.com': ['93.184.216.34', '10.0.0.5'],
  'metadata.example.com': ['169.254.169.254'],
  'nowhere.example.com': [],
};
const resolve = async (host: string) => {
  assert.ok(host in dns, `unexpected lookup of ${host}`);
  return dns[host];
};

const blocked: [string, string][] = [
  ['loopback', 'http://127.0.0.1/'],
  ['loopback, whole /8', 'http://127.9.8.7:8080/'],
  ['unspecified', 'http://0.0.0.0/'],
  ['[::1]', 'http://[::1]/'],
  ['IPv4-mapped loopback', 'http://[::ffff:127.0.0.1]/'],
  ['169.254.169.254', 'http://169.254.169.254/latest/meta-data/'],
  ['RFC1918 10/8', 'http://10.0.0.1/'],
  ['RFC1918 172.16/12', 'http://172.16.0.1/'],
  ['RFC1918 172.16/12, top', 'http://172.31.255.255/'],
  ['RFC1918 192.168/16', 'https://192.168.1.1/'],
  ['IPv6 unique local', 'http://[fd00::1]/'],
  ['IPv6 link-local', 'http://[fe80::1]/'],
  ['decimal IP', 'http://2130706433/'],
  ['hex IP', 'http://0x7f000001/'],
  ['octal IP', 'http://0177.0.0.1/'],
  ['credentials before a loopback host', 'http://a@127.0.0.1/'],
  // A connector follows redirects by hand and checks each Location (L5 T8); the target is a URL like any other.
  ['redirect to a private address', new URL('http://169.254.169.254/latest/', 'https://api.example.com/start').href],
  ['a name that resolves to metadata', 'http://metadata.example.com/'],
  ['a name with one private address among public ones', 'https://rebind.example.com/'],
  ['a name that resolves to nothing', 'https://nowhere.example.com/'],
  ['file://', 'file:///etc/passwd'],
  ['gopher://', 'gopher://api.example.com:70/_'],
];

for (const [name, url] of blocked) {
  test(`egress blocks ${name}`, () => assert.rejects(assertSafeEgress(url, resolve), /Egress blocked/));
}

test('egress blocks localhost through the system resolver', () =>
  assert.rejects(assertSafeEgress('http://localhost:3000/'), /Egress blocked/));

test('egress allows a public host and returns the addresses it checked', async () => {
  assert.deepEqual(await assertSafeEgress('https://api.example.com/v1', resolve), ['93.184.216.34']);
  assert.deepEqual(await assertSafeEgress('http://8.8.8.8/', resolve), ['8.8.8.8']);
});
