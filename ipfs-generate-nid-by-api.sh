#!/bin/bash

source utils.sh

setCaptureToken

read -p "Filepath of the asset for generating Nid: " filePath
if [ "${filePath}" == "" ]; then
    echo "No filepath provided. Exiting..."
    exit 1
else
    echo -e "\n\nGenerating Nid of ${filePath}...\n"
fi

curl -X POST "https://eoqctv92ahgrcif.m.pipedream.net" \
     -H "Authorization: token ${captureToken}" \
     -F "file=@${filePath}" \
     -F "pin=false"
