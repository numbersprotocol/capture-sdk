#!/bin/bash

source utils.sh

setCaptureToken

echo -e "\nThe assets count owned by a user is:\n"

curl -X GET "https://api.numbersprotocol.io/api/v3/auth/users/me/" \
     -H "Authorization: token ${captureToken}" | jq -r '.asset_count'

