#!/bin/bash

read -sp "X-Api-Key: " captureApikey
read -sp "Capture token: " captureToken
read -p "Asset Nid: " assetNid
read -p "Received wallet address: " walletAddress

echo -e "\n\nExporting...\n"

curl -X POST "https://api.numbersprotocol.io/api/v3/assets/${assetNid}/export/" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -H "X-Api-Key: ${captureApikey}" \
     -H "Authorization: token ${captureToken}" \
     -d "{\"address\": \"${walletAddress}\"}"
