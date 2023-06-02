#!/bin/bash

read -p "Filepath of the asset for generating Nid: " filePath
if [ "${filePath}" == "" ]; then
    echo "No filepath provided. Exiting..."
    exit 1
else
    echo -e "\n\nGenerating Nid of ${filePath}...\n"
fi

# Capture output of 'ipfs add' command into a variable
output=$(ipfs add --only-hash --cid-version=1 --quiet ${filePath})

# Extract the CID from the output
cid=$(echo $output | awk '{print $1}')

# Print the Nid
echo "Nid: ${cid}"
