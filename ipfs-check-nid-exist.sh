#!/bin/bash

source utils.sh

setCaptureToken

read -p "Nid of to check: " nid
if [ "${nid}" == "" ]; then
    echo "No Nid provided. Exiting..."
    exit 1
else
    echo -e "\n\nChecking if ${nid} exists on Numbers IPFS...\n"
fi

curl -s -X POST "https://eobf91xa1ra7i2n.m.pipedream.net" \
    -H "Authorization: token ${captureToken}" \
    -d "{\"nid\": \"${nid}\"}" | jq
