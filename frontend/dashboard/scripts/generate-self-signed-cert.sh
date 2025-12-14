#!/usr/bin/env bash
# Generates a self-signed certificate and private key for local testing.
# Produces PEM files and prints a base64-encoded DER certificate string (x5c)
# suitable for uploading into Login.gov's "Public Certificate" field.

set -euo pipefail

OUT_DIR=${1:-./config/keycloak}
NAME=${2:-keycloak-ttse}
DAYS=${3:-3650}

mkdir -p "$OUT_DIR"

KEY_FILE="$OUT_DIR/${NAME}.key.pem"
CERT_FILE="$OUT_DIR/${NAME}.cert.pem"
DER_FILE="$OUT_DIR/${NAME}.cert.der"

echo "Generating self-signed cert (private key -> $KEY_FILE, cert -> $CERT_FILE)"

openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  #!/usr/bin/env bash
  # Generates a self-signed certificate and private key for local testing.
  # Produces PEM files and prints a base64-encoded DER certificate string (x5c)
  # suitable for uploading into Login.gov's "Public Certificate" field.

  set -euo pipefail

  OUT_DIR=${1:-./config/keycloak}
  NAME=${2:-keycloak-ttse}
  DAYS=${3:-3650}

  mkdir -p "$OUT_DIR"

  KEY_FILE="$OUT_DIR/${NAME}.key.pem"
  CERT_FILE="$OUT_DIR/${NAME}.cert.pem"
  DER_FILE="$OUT_DIR/${NAME}.cert.der"

  echo "Generating self-signed cert (private key -> $KEY_FILE, cert -> $CERT_FILE)"

  openssl req -x509 -nodes -days "$DAYS" -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=${NAME}"

  echo "Converting to DER and base64 (x5c)"
  openssl x509 -in "$CERT_FILE" -outform der -out "$DER_FILE"

  # Base64 encode DER and print without line wraps. Use openssl if available
  # (portable on macOS and Linux), otherwise fall back to base64 + tr. As a
  # final fallback use python3 if present.
  if command -v openssl >/dev/null 2>&1; then
    X5C=$(openssl base64 -A -in "$DER_FILE")
  else
    if base64 "$DER_FILE" >/dev/null 2>&1; then
      X5C=$(base64 "$DER_FILE" | tr -d '\n')
    elif command -v python3 >/dev/null 2>&1; then
      X5C=$(python3 -c "import sys,base64; print(base64.b64encode(sys.stdin.buffer.read()).decode())" < "$DER_FILE")
    else
      echo "Error: no tool available to base64-encode the DER file" >&2
      exit 2
    fi
  fi

  echo
  echo "-----BEGIN PUBLIC CERT (x5c)-----"
  echo "$X5C"
  echo "-----END PUBLIC CERT (x5c)-----"

  echo
  echo "Files created:"
  echo "  Private key: $KEY_FILE"
  echo "  Certificate: $CERT_FILE"
  echo "  DER cert: $DER_FILE"

  echo
  echo "IMPORTANT: Keep the private key ($KEY_FILE) secure. Do not commit it to
  version control. Use cloud.gov CredHub or another secret store for production."

  exit 0
