# Visitor IP Logs

Root panel: `/panel-xyz123/visitor-logs`. Staff and public users cannot read the
page, API, stored IPs, or linked contacts. Supabase anon/authenticated roles have
no table or RPC access. The service role can read and enrich technical data;
new observations are written through a dedicated RPC.

## Capture and deduplication

Apply `supabase/migrations/20261116090000_add_visitor_ip_logs.sql` before deploying.
It adds three tables and two server-only RPCs without changing business data.
Guest-session email notifications are removed from the guest authentication path.

Next.js proxy records public storefront page requests in a background task, even
without JavaScript or guest sign-in. Both `meta-peptides.com` and `metawellness.id`
(including www aliases) use the same log. Static assets, prefetch/RSC requests,
admin pages and API requests do not create page observations. Successful guest,
login, registration, OAuth, user-session and checkout requests can link the
server-verified account to the same IP. Requests blocked before reaching the
application (for example by a firewall) are outside this log's coverage.

Recognized bot/crawler User-Agents (including Meta link previews, Google/Bing,
headless tools, monitors and command-line HTTP clients) are skipped before any
database write or enrichment, including on auth/checkout hooks. The panel also
filters existing bot devices and bot-only IPs using the raw User-Agent, covering
older Meta records whose `is_bot` flag was false. Filtering happens in the query
before pagination and totals. Mixed IPs remain visible if they have a non-bot
device; only those devices are counted/shown. Stored historical evidence is not
deleted. No schema migration is needed for this filter.

This removes identifiable automation, not every possible bot: a bot can imitate
a browser User-Agent. Country, ISP and datacenter flags alone do not exclude an
IP, so legitimate visitors using VPNs or shared networks are not discarded.

- One canonical IPv4/IPv6 record per IP, across both domains.
- A repeated IP, browser signature or linked account creates no duplicate row.
- New browser/device signatures become child records of the existing IP.
- A second domain is added to the same IP record, not another visitor row.
- First observation/path is preserved. No repeated-visit timeline is stored.
- Different users behind a shared IP remain separate linked accounts.

Production capture trusts Vercel's overwritten request-IP headers. Outside
Vercel it fails closed instead of accepting arbitrary forwarded IP headers.
Private/reserved IPs and malformed chains are discarded. Local development
supports `localhost` with a public test IP in `x-forwarded-for`; production
localhost requests are skipped. Preview-deployment hostnames are not captured.

## Available information

IP, first-seen time, domains, initial path, ISP, ASN organization, approximate
country/region/city/postcode/timezone and coordinates, and available VPN/proxy/
Tor/hosting/mobile-network indicators. User-Agent and client hints provide
browser/version, OS, device category, and model when the browser exposes one.
Device signatures describe browser metadata, not a hardware identity: updates
can create another signature and identical browsers can share one.

Network/location enrichment uses a bounded HTTPS request to IPQuery only for a
new IP. The lookup sends only the public IP to the provider. Vercel geolocation
headers provide initial location when available. Provider failures/timeouts do
not block page loading or discard the captured IP. Root can retry a stored IP
lookup from its detail view, limited to once per ten minutes. Empty fields stay
unknown. No API key or paid subscription is configured by this integration.

The detail view shows an approximate OpenStreetMap area and an external map link.
This is a network location estimate, not GPS or a person's household address.
Network indicators are provider classifications, not proof of visitor behavior.

Names/email/phones come only from profiles and checkout records tied to a
server-verified auth user. There is no IP-to-person search. Account details and
shipping-recipient contacts are shown separately because recipients, account
holders and visitors can be different people. IPs shared by many users can show
multiple accounts. Detail views show up to 100 recent device signatures, 50
linked accounts and 100 recent checkout references, with limits indicated.

Query strings/fragments and referrer query strings are stripped, preventing auth
codes/reset tokens in URLs from entering the log. Passwords, auth tokens, browser
storage, precise GPS and contact lists are not collected.

## Checks

```sh
npm run test:visitor-logs
npm run test:visitor-logs-db  # disposable PostgreSQL in Docker, network disabled
npm run build
```

Database tests exercise deduplication, IPv6 canonicalization, separate identities
on shared IPs, first-seen preservation, lookup cooldown and restricted permissions.
Route tests verify root-only APIs and the guest flow without email calls.

References: [Vercel request headers](https://vercel.com/docs/headers/request-headers),
[IPQuery API](https://ipquery.io/developers/api),
[IPQuery field meanings](https://ipquery.io/developers/fields).
