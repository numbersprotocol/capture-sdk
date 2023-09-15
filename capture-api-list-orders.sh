#!/bin/bash

source utils.sh

setCaptureToken

echo "Your account orders are: "

# The command below equals to:
# curl -X GET "https://api.numbersprotocol.io/api/v3/store/network-app-orders/?limit=200&offset=0"
#
# limit: pagination size, default: 200
# offset: starting index of your account orders, default: 0
# returned result is in descending order of created_at (creation time of the order).
#
# total_cost: total cost of an order, including service fee and gas fee, paid with NUM or Capture Credits.
# status: status of an order, can be: "created", "pending", "success", "failure". The value will be "success" if total_cost is charged successfully.
curl -s -X GET "https://api.numbersprotocol.io/api/v3/store/network-app-orders/" \
  -H "Authorization: token ${captureToken}" | jq -r '.results[] | [.created_at, .network_app_name, .total_cost, .status] | @csv'
