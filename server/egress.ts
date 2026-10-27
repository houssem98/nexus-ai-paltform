import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// Addresses an outbound call must never reach: this host, private networks, link-local (cloud metadata),
// carrier-grade NAT, benchmarking, multicast and reserved space, and NAT64. BlockList checks IPv4-mapped IPv6
// (::ffff:a.b.c.d) against the IPv4 rules itself; a ::ffff:0:0/96 rule would block every IPv4 address. The other
// IPv6 forms that embed an IPv4 address (IPv4-compatible, SIIT, NAT64, 6to4) are blocked whole, as is site-local.
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 96], ['::ffff:0:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['2002::', 16], ['fc00::', 7], ['fec0::', 10],
  ['fe80::', 10], ['ff00::', 8],
] as const) blocked.addSubnet(net, prefix, 'ipv6');

export type Resolve = (hostname: string) => Promise<string[]>;
const systemResolve: Resolve = async (host) => (await lookup(host, { all: true })).map((a) => a.address);

// Throws unless the URL is http(s) and every address its host resolves to is public. Returns those addresses so the
// caller connects to what was checked, not to a second lookup that may answer differently.
export async function assertSafeEgress(url: string, resolve: Resolve = systemResolve): Promise<string[]> {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`Egress blocked: scheme ${u.protocol}`);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await resolve(host);
  const bad = addresses.find((a) => !isIP(a) || blocked.check(a, isIP(a) === 6 ? 'ipv6' : 'ipv4'));
  if (addresses.length === 0 || bad !== undefined) throw new Error(`Egress blocked: ${u.hostname} resolves to ${bad ?? 'no address'}`);
  return addresses;
}
