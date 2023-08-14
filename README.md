<h1 align="center">Decky Terminal</h1>
<p align="center">A Missing Terminal plugin that turns your Steam Deck into Portable Linux Battlestation.</p>

----

## Why do I need it?
Here are the cases that Decky Terminal can help you out!
* Quickly run some command-line application in game-mode
* Show off your `"31337"` Linux command line skills to public on the go 
* Edit simple file with vim/emacs without exiting to KDE jumping all the hoops  
  <sup>(GNU/Emacs installed seperately)</sup>
* Use it as your dumb terminal for your ssh  
  <sup>(phone hotspot data plan sold seperately)</sup>
* Manage your network infrastructure with GNU/Screen   
  <sup>(GNU/Screen installed seperately, RS232 to USB converter sold seperately)</sup>

## Build Instructions
### Prerequisites
* Linux Installation <sup>(for prebuilt Decky Loader CLI)</sup> or Rust installation on POSIX Compliant OS <sup>(e.g. macOS)</sup>
* Latest LTS version of NodeJS
* pnpm
* docker installation

### If you are not using Linux
If you are using something other POSIX compliant OS (or has docker user-rights properly configured), Please modify `.vscode/build.sh` or `.vscode/deploy.sh` not to use sudo, since Docker doesn't require sudo to run on macOS platform (running in Linux virtual machine). 

### How to Build
1. Resolve pnpm dependencies with `pnpm i` command
2. Create cli directory on repository root (`mkdir cli`)
3. Put compiled CLI binary ([Precompiled Linux binary](https://github.com/SteamDeckHomebrew/cli/releases/latest)) at `./cli/decky`
   - If you are using other POSIX compliant OS, clone the repo and compile with `cargo build`.
   - If you are using Windows, Use WSL2 (Arch Linux preferred) and setup all of prerequisites.
4. run `pnpm build-zip`
5. Enter sudo password if requested.  
   (Required for compiling for holo-iso environment)
6. Your bundle is now available at `./out/decky-terminal.zip`. Enjoy!

## Footnote
Valve, If you are reading this. PLEASE integrate proper command line console on game mode.  
This should be included in the Steam client's developer option.
