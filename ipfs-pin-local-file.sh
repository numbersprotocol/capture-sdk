#!/bin/bash

source utils.sh

setCaptureToken

read -p "Filepath of the asset for pinning: " filePath
if [ "${filePath}" == "" ]; then
    echo "No filepath provided. Exiting..."
    exit 1
else
    echo -e "\n\nPinning ${filePath}...\n"
fi

curl -X POST "https://eoqctv92ahgrcif.m.pipedream.net" \
     -H "Authorization: token ${captureToken}" \
     -F "file=@${filePath}"
