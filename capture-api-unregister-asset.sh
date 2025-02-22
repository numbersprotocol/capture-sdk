#!/bin/bash

source utils.sh

setCaptureToken

read -p "The Nid of the asset you want to unregister: " assetNid
echo -e "\n\nYour target Asset Nid for unregistration is: ${assetNid}"

curl -X DELETE "https://api.numbersprotocol.io/api/v3/assets/$assetNid/" \
  -H "Authorization: token ${captureToken}"
