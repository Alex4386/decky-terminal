#!/bin/bash
CLI_LOCATION="$(pwd)/cli"
echo "Building plugin in $(pwd)"

# Custom Build Routine
echo "Taking out defaults/main.py to /main.py"
# read -s sudopass

# printf "\n"

echo $sudopass | sudo $CLI_LOCATION/decky plugin build $(pwd)

# Custom build routine epilogue
