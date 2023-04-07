#!/bin/bash

source utils.sh

setCaptureToken

echo -e "\nYour Capture wallet balance:\n"

curl -X GET "https://api.numbersprotocol.io/api/v3/auth/users/?show_num_balance=true" \
     -H "Authorization: token ${captureToken}" | jq '.results[0].user_wallet'
