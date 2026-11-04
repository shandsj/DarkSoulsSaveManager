# A save manager for dark souls.  

Can be used with any game that uses only a single save file.  

Confirmed working for:  
Dark Souls  
Dark Souls 2  
Dark Souls 3  
Elden Ring  

## To use:  
Download: https://github.com/omgftw/DarkSoulsSaveManager/releases  

## To develop:  
Get node: https://nodejs.org  
Run "npm install" from command line in the root directory (The directory containing "package.json")  
Run "npm install -g electron"  
Run "electron main.js" from command line in the root directory  
Open the project in your favorite editor/IDE and edit the files in the "app" folder  
After making changes hit "Ctrl+R" or select "View -> Reload" From the menu  

## To build:  
Get node: https://nodejs.org  
Get InnoSetup
Run "npm install" from command line in the root directory (The directory containing "package.json")  
Run "gulp build"  
Run the installer.iss file using InnoSetup  
The installer can be found in the "Output" directory

## Linux support (in development)

Linux support is being developed in the `feature/linux-native-build` branch, with Bazzite as the primary test platform.

The initial platform layer discovers native and Flatpak Steam installations and parses both generations of Steam's `libraryfolders.vdf` format. Proton game-save discovery and Linux packaging are being added in subsequent steps.

Run the platform tests with:

```sh
node --test
```

See [Linux support notes](docs/linux-support.md) for the compatibility and data-safety goals.
