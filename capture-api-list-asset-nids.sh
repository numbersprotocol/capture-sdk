#!/bin/bash

source utils.sh

setCaptureToken

echo "Your registered assets are: "

# The command below equals to:
# curl -X GET "https://dia-backend.numbersprotocol.io/api/v3/assets/?limit=200&offset=0"
#
# limit: pagination size, default: 200
# offset: starting index of your registered asset Nids, default: 0
curl -X GET "https://dia-backend.numbersprotocol.io/api/v3/assets/" \
  -H "Authorization: token ${captureToken}" | jq '.results[].id'
