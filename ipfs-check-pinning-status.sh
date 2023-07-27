#!/bin/bash

URL="https://ipfs-pin.numbersprotocol.io/api/v0"
CID="$1"

# 405 - Method Not Allowed
#curl -u numbers:3amiW9xv0s1k7AiC2Ge0 "${URL}/pin/ls?arg=${CID}"

#curl -X POST "${URL}/pin/ls?arg=/ipfs/${CID}&quiet=false&stream=true" \
curl -X POST "${URL}/pin/ls?arg=${CID}&quiet=false&stream=true&type=recursive" \
    -u numbers:3amiW9xv0s1k7AiC2Ge0
