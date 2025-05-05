#!/bin/bash
CLI_LOCATION="$(pwd)/cli"
TARGET_PATH="/home/deck/decky-terminal.zip"

echo "Build and Deployer for DeckyLoader"
echo "Written by Alex4386"

# Custom Build Routine
echo "Taking out defaults/main.py to /main.py"

# main build routine.
sudo $CLI_LOCATION/decky plugin build $(pwd)
echo "Build Complete!"
sudo chown -R $USER $(pwd)/out

# Custom build routine epilogue
scp "$(pwd)/out/Decky Terminal.zip" deck@deploy-deck:$TARGET_PATH
ssh -t deck@deploy-deck "sudo cp "$TARGET_PATH" ./homebrew/plugins/decky-terminal.zip && cd ./homebrew/plugins/ && sudo rm -rf './Decky Terminal' && sudo unzip decky-terminal.zip && sudo rm -rf decky-terminal.zip && sudo systemctl restart plugin_loader.service"
