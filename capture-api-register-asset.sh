#!/bin/bash

source utils.sh

setCaptureToken

read -p "File URL: " fileURL
echo -e "\n\nYour asset registration result is: "

curl -X POST "https://api.numbersprotocol.io/api/v3/assets/" \
  -H "Content-Type: multipart/form-data" \
  -H "Accept: application/json" \
  -H "Authorization: token ${captureToken}" \
  -F "asset_file=@\"${fileURL}\"" \
  -F "caption=This is a testing sample." \
  -F 'nit_commit_custom={
      "parentAssetCid": "<parent-asset-nid>",
      "usedBy": "https://numbersprotocol.io",
      "digitalSourceType": "digitalCapture",
      "myCustomField": "myCustomValue"
  }' \
  -F "public_access=true" \
  -F 'meta={
     "proof": {
        "hash": "",
        "mimeType": "",
        "timestamp": ""
     },
     "information": [
        {
            "provider": "Capture API",
            "name": "version",
            "value": "v3"
        }
     ]
    }' \
  -F "caption=This is a testing sample."
