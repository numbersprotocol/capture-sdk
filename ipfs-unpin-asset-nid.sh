#!/bin/bash

source utils.sh

setCaptureToken

read -p "Nid of the asset for unpinning: " nid
if [ "${nid}" == "" ]; then
    echo "No Nid provided. Exiting..."
    exit 1
else
    echo -e "\n\nUnpinning ${nid}...\n"
fi

curl -X POST "https://eoomqofcyr7y0fl.m.pipedream.net" \
     -H "Authorization: token ${captureToken}" \
     -d "{\"nid\": \"${nid}\"}"
