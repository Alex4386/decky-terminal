![Banner](https://github.com/user-attachments/assets/bfe5fa56-0f64-4f16-beb8-e6a46b9c18bd)

<p align="center"><b>DeckyTerminal</b>: A Missing Terminal emulator plugin for "game mode" for Steam Deck or other Linux handhelds</p>

<!--
<p align="center"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fplugins.deckbrew.xyz%2Fplugins&query=%24%5B%3F(%40.name%20%3D%3D%20'Decky%20Terminal')%5D.downloads&suffix=%20installs&label=decky&color=3ea6a3" /></p>
-->

## What is this?
Decky Terminal is a terminal emulator plugin for Decky Loader, that allows you to run command line applications while in the game mode, without exiting to KDE or equivalent desktop environment (on non-SteamOS).  
It is a simple terminal emulator based on [xterm.js](https://xtermjs.org/) and [React](https://reactjs.org/) that runs on top of Decky Loader., allowing you to run some quick command line applications.

### Use cases
Here are some use cases that you can do with Decky Terminal:
* Quickly run some command-line application in game-mode
* Show off your `"31337"` Linux command line skills to public on the go 
* Edit simple file with vim/emacs without exiting to KDE jumping all the hoops  
  <sup>(GNU/Emacs installed seperately)</sup>
* Use it as your dumb terminal for your ssh  
  <sup>(phone hotspot data plan sold seperately)</sup>
* Manage your network infrastructure with GNU/Screen   
  <sup>(GNU/Screen installed seperately, RS232 to USB converter sold seperately)</sup>
* [Decide NPC's fate](https://www.youtube.com/watch?v=cLT465WM8uw)
* [Play BadApple](https://www.youtube.com/watch?v=pSygAG933Yw)
* [Fix broken IME inputs](https://gall.dcinside.com/mgallery/board/view/?id=umpc&no=65008)

## Build Instructions
See [BUILD.md](./BUILD.md) for detailed build instructions.


## License
Distributed under BSD-3-Clause License  
(`./src/common/xterm_css.tsx` is exempt from BSD-3-Clause License and distributed under MIT License)

