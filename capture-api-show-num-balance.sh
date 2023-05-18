#!/bin/bash

source utils.sh

setCaptureToken

echo -e "\nYour Capture wallet balance:\n"

curl -X GET "https://api.numbersprotocol.io/api/v3/auth/users/me/" \
     -H "Authorization: token ${captureToken}" | jq '.'
