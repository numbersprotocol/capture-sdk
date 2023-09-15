#!/bin/bash

read -p "Capture account email: " captureEmail
read -p "Capture account username: " captureUsername
read -sp "Password: " capturePassword
read -sp "X-Api-Key: " captureApiKey
echo "\n\nYour Capture accout sign up result is: "

curl -X POST "https://api.numbersprotocol.io/api/v3/auth/users/" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -H "X-Api-Key: ${captureApiKey}" \
     -d "{
        \"username\": \"${captureUsername}\",
        \"password\": \"${capturePassword}\",
        \"email\": \"${captureEmail}\",
        \"activation_method\": \"skip\",
        \"language\": \"en\"
    }"
