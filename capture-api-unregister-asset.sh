#!/bin/bash

source utils.sh

setCaptureToken

read -p "Target Asset Nid: " assetNid
echo -e "\n\nYour target Asset Nid for unregistration is: ${assetNid}"

curl -X DELETE "https://dia-backend.numbersprotocol.io/api/v3/assets/$assetNid/" \
  -H "Authorization: token ${captureToken}"
