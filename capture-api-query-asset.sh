#!/bin/bash

source utils.sh

setCaptureToken

read -p "Target Asset Nid: " assetNid
echo -e "\n\nInformation of your registered Asset $assetNid is: "

curl -X GET "https://dia-backend.numbersprotocol.io/api/v3/assets/$assetNid/" \
  -H "Authorization: token ${captureToken}" | jq .
