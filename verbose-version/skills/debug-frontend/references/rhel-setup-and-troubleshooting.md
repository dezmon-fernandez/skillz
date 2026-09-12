# Debug Frontend: RHEL Setup and Troubleshooting

Verified on RHEL 9 with Chromium 152 from EPEL and agent-browser 0.36. Other platforms get their own
file in this folder. The trust model below applies everywhere; the commands do not.

## The trust model

Envoy on `:8443` requires a client certificate signed by the Coyote Local CA. A browser has to pass two
checks, one in each direction:

1. **Trust the server.** Envoy's cert is signed by a private CA no browser trusts by default.
2. **Prove itself to the server.** Envoy closes the connection unless the browser presents a cert.

Chromium takes both from the user's NSS store at `~/.pki/nssdb`. When a server asks for a client cert it
shows a picker dialog; headless has nobody to click it, so a policy answers it in advance.

## One-time setup

```bash
CERTS=~/work/coyote/coyote-dev-config/local_dev/certs     # sibling checkout, certs from generate-certs.sh

# Browser and NSS tools. agent-browser finds /usr/bin/chromium-browser on PATH by itself;
# never run `agent-browser install` on Red Hat.
sudo dnf install -y chromium nss-tools

# Client cert and CA into the shared NSS store.
pk12util -i $CERTS/dev-user-1.p12 -d sql:$HOME/.pki/nssdb -W changeit
certutil -A -n "Coyote Local CA" -t "C,," -i $CERTS/coyote-local-ca.crt -d sql:$HOME/.pki/nssdb

# Auto-select the Coyote cert for :8443 so no picker appears. Scoped to that port and to certs issued by
# the Coyote CA, so any other app on the port still prompts.
RULE='{"pattern":"https://localhost:8443","filter":{"ISSUER":{"CN":"Coyote Local CA"}}}'
sudo mkdir -p /etc/chromium/policies/managed
jq -n --arg rule "$RULE" '{AutoSelectCertificateForUrls: [$rule]}' \
  | sudo tee /etc/chromium/policies/managed/coyote-mtls.json

npm i -g agent-browser
```

Verify:

```bash
certutil -L -d sql:$HOME/.pki/nssdb        # user cert u,u,u and the CA C,,
agent-browser doctor                        # Chrome: pass ... at /usr/bin/chromium-browser
agent-browser open https://localhost:8443   # prints Open Arsenal
```

## When `agent-browser open` fails

| Error | Cause | Fix |
|---|---|---|
| `No Chrome binary found` | Only `chromium-headless` is installed; nothing on PATH | `sudo dnf install chromium` |
| `ERR_CERT_AUTHORITY_INVALID` | CA not in `~/.pki/nssdb`, or there with trust `,,` | CA step; trust must be `C,,` |
| `ERR_BAD_SSL_CLIENT_AUTH_CERT` | Client cert not in `~/.pki/nssdb` | Client cert step |
| `Page.navigate` timeout | Chromium is waiting on the cert picker | Policy step |
| `upstream connect error` | mTLS passed; dev server is down | `npm start` |
| Page loads, then every command sees `about:blank` | `--profile` was passed | Drop the flag |
| Hang or cert error with `--ca-cert` / `--ignore-https-errors` | Those flags use a fresh cert store | Drop the flag |

Envoy's view of the last handshake:

```bash
docker logs --since 2m local_dev-envoy-1 | grep -i TLS_error
```

`PEER_DID_NOT_RETURN_A_CERTIFICATE` is check 2. `SSLV3_ALERT_CERTIFICATE_UNKNOWN` is check 1. No TLS
error alongside a browser timeout is the picker.
