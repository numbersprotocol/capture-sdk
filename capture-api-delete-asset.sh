#!/bin/bash

source utils.sh

setCaptureToken

read -p "The asset nid you want to delete: " nid
echo -e "\n\nYour asset delete is done. "

curl -L -X DELETE "https://dia-backend.numbersprotocol.io/api/v3/assets/${nid}/" \
  -H "Accept: application/json" \
  -H "Authorization: token ${captureToken}"
