#!/bin/sh

curl --location 'https://api.numbersprotocol.io/api/v3/assets/' \
--header 'Authorization: token <captureToken>' \
--header 'X-Api-Key: <captureApiKey>' \
--form 'asset_file=@"/Users/bafu/Downloads/beautiful_purple.png"' \
--form 'caption="Beautiful purple"' \
--form 'headline="You cannot find the difference"' \
--form 'auto_mint="true"' \
--form 'auto_product="true"' \
--form 'product_price="10"' \
--form 'product_price_base="num"' \
--form 'product_quantity="3"' \
--form 'product_show_on_explorer="false"'

