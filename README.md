minecraft-on-demand
===================

UHC is a minecraft mini-game growing in popularity. Without the use of mods it is hard to set up many of these games inside one world.
My solution is to spin up new minecraft servers for each game, and bring them down once the game has finished.

Includes:

1. Express server for managing games and teams
2. Minecraft server script which downloads correct minecraft_server version and wraps the game outputs and inputs (node child process spawn).
3. Script that gets executed from /etc/init.d/rc.local of a linux server.

Flow:

1. User creates team and searches for a game.
2. Match is found
3. Digital Ocean spins up a pre-prepared image with the mc_alive folder
4. alive.js pulls in all dependencies (server.properties, whitelist, etc)
5. mc_server.js starts minecraft_server as a child process and pipes all its inputs and outputs through mc_server.js
6. GameManager.js listens for certain events within the game and updates the express client
7. When only one team remains, GameManager.js sends a kill command back to the express server
8. Express server logs game stats and tells Digital Ocean to kill that droplet

This project was purely proof of concept and a lot of fun to make.