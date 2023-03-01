#!/bin/sh
if [[ $# -ge 1 ]]; then
    echo "setting $1"
    export global ERC_IMAGE_URI=$1
    echo $ERC_IMAGE_URI
else
    echo 1>&2 "Provide ECR image arg example: ./set_erc_image_url.sh {accountid}.dkr.ecr.us-east-2.amazonaws.com/IMAGE_NAME:TAG"
    #exit 1
fi