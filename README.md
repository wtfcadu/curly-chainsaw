# Interactive sphere of particles

Interactive 3D demonstration of a sphere made of particles that reacts to mouse movement. When you hover the cursor over a sphere, the particles in the area around the cursor are attracted to it, creating a visual "mound" effect.

## Features

- The sphere consists of 10,000 individual particles
- The particles stay in their original positions
- When you hover the mouse, the particles are stretched in a direction perpendicular to the surface of the sphere
- When the mouse moves, the "mound" moves following the cursor
- The particles smoothly return to their places when the cursor is moved

## How to launch

1. Open the file `index.html ` in a modern web browser
2. Hover the mouse cursor over the sphere and move it over the surface

## Technology

- Three.js for 3D rendering and interactivity
- JavaScript for interaction logic
- HTML/CSS for structure and styles

## Setting up the parameters

In the file `script.js ` the following parameters can be configured:

- `sphereRadius' - The radius of the sphere
- `Particulecount` - the number of particles
- `Attraction Radius` - The radius of the cursor's influence on the particles
- `maxDisplacement` - maximum displacement of particles from their positions
- `returnSpeed` - the rate at which the particles return to their places