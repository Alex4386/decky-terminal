#!/bin/bash
CLI_LOCATION="$(pwd)/cli"
TARGET_PATH="/home/deck/decky-terminal.zip"

echo "Build and Deployer for DeckyLoader"
echo "Written by Alex4386"

# Custom Build Routine
echo "Taking out defaults/main.py to /main.py"
mv $(pwd)/main.py $(pwd)/main.py.old
cp $(pwd)/defaults/main.py $(pwd)/main.py
cp -r $(pwd)/websockets/src/websockets $(pwd)/defaults/py_modules/websockets
mv $(pwd)/defaults/main.py $(pwd)/defaults/main.py.bak

# main build routine.
sudo $CLI_LOCATION/decky plugin build $(pwd)
echo "Build Complete!"
sudo chown -R $USER $(pwd)/out

# Custom build routine epilogue
mv $(pwd)/main.py.old $(pwd)/main.py
mv $(pwd)/defaults/main.py.bak $(pwd)/defaults/main.py
rm -rf $(pwd)/defaults/py_modules/websockets
scp "$(pwd)/out/Decky Terminal.zip" deck@deploy-deck:$TARGET_PATH
