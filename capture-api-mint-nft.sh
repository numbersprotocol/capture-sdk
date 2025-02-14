#!/bin/bash

read -sp "Capture token: " captureToken
echo
read -sp "X-Api-Key: " captureApikey
echo
read -p "Asset Nid: " assetNid

echo -e "\n\nMinting NFT......:"


curl -X POST "https://dia-backend.numbersprotocol.io/api/v3/assets/${assetNid}/mint/" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -H "x-api-key: ${captureApikey}" \
     -H "Authorization: token ${captureToken}" \
     -d '{
          "nft_blockchain_name": "thundercore",
          "no_blocking": true,
          "force_replace": false
         }'
