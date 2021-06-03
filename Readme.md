# ThreeeJS POCs

This project is a collection of samples experimenting some aspects of game development with threejs.

## Current Examples

- _Example 1_: Simple collision and IA followin the player sample
- _Example 2_: Loading multiple model animations and placing a sword in model hand
- _Example 3_: Simples physics sample
- _Example 4_: Improving the sample 1 with keyboard controls and camera system
- _Example 5_: Camera follow sample

## Next steps

- Move the reusable code in and engine directory
- Create a sample specific to prove the input system features
- Improve the input system and create a debug mode of it
- Create a sample specific to prove the model loader system features
- Improve the model loader system and create a debug mode of it
- Create a sample specific to prove the camera system features
- Improve the camera system and create a debug mode of it
- Create a sample specific to physics system features
- Improve the physics system and create a debug mode of it

## Local run

Install the dependencies with `npm i`, so run the local server with `npm start`

## Engine [WIP]

### Core systems

#### Input system

- read the keyboard
- read the mouse
- read the gamepad

#### Model loader

- load a model
- play and stop animation
- change animation
- attach models, like weapons in hand

#### Camera system

- follow the model
- follow the mouse
- just looking at model
- free movement
- focus in something temporary
- camera collision system
- camera debug mode

#### Physics system

- movement the model
- jump logic model
- integration with multiple external physics lib
  _[Collision features]_
- detect the floor and platforms
- detect collision with collectables
- detect collision with others models
- detect collision between Collision boxes inside model

#### Debug system

- can turn on/off the debug options in each system
- can turn on/off systems
- can add or remove models

### Extra systems

- Level builder system
- Model customization system
- Particle system
- Sub games system
- Scenes system

### Samples LAB

#### Racing game

- Multiple level system
- Menu system
- Basic IA system

#### Platform game

- Physics system/ better collision system
- Multiple ambient system (swimming, flying, etc..)
- Basic IA system

#### Fighting game

- Advanced keyboard system
- Collision box by animation
- IA fighting systen

#### RPG

- player levels/skills system
- player armor/weapons system
- focus battle system

#### Shooter game

- targeting with mouse or keyboard system
- shooting system
- multi weapon system

#### Hack and slash
