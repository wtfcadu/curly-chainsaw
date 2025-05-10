// Main variables
let scene, camera, renderer;
let particleSystem, particles;
let raycaster, mouse;
let sphere;
let lastIntersectionPoint = null;
let time = 0; // Adding time variable for wave animation
let sideWavesTime = 0; // Time for side waves

// Particle parameters (fixed values, no longer controlled by UI)
let sphereRadius = 100;
let particleCount = 10000;
let attractionRadius = 25;
let maxDisplacement = 20;
let returnSpeed = 0.1;
let waveSpeed = 0.3;
let rippleEffect = 0.7;
let waveFrequency = 0.1;
let waveAmplitude = 5.0;
let particleSize = 1.5;
let waveRadius = 50;
let sideWaveIntensity = 8.0;
let sideWaveSpeed = 0.3;
let sideWaveFrequency = 0.5;
let sideWaveWidth = 0.7;

// At the top of script.js, make sure these variables are accessible globally
window.particleSystem = null;
window.sphere = null;
window.panelOffset = 0; // Track the current offset

// Check if Three.js is loaded
window.addEventListener('DOMContentLoaded', function() {
    if (typeof THREE === 'undefined') {
        console.error('THREE is not defined. Three.js library is not loaded.');
        document.getElementById('error-message').style.display = 'block';
        return;
    }
    
    // Initialize after checking
    init();
    animate();
});

// Scene initialization
function init() {
    // Create scene, camera and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true // Enable alpha (transparency)
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background (alpha = 0)
    document.body.appendChild(renderer.domElement);

    // Camera setup - increase distance
    camera.position.z = 300;
    
    // Add light for better visualization
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add a subtle point light at camera position for front lighting
    const pointLight = new THREE.PointLight(0x4477ff, 0.8);
    pointLight.position.set(0, 0, 300);
    scene.add(pointLight);

    // Create geometry for particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocity = new Float32Array(particleCount * 3); // Add velocity vector for each particle

    // Generate particle positions on the sphere
    for (let i = 0; i < particleCount; i++) {
        // Uniform distribution of points on the sphere
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;

        const x = sphereRadius * Math.sin(phi) * Math.cos(theta);
        const y = sphereRadius * Math.sin(phi) * Math.sin(theta);
        const z = sphereRadius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Save original positions
        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        // Initialize velocity as 0
        velocity[i * 3] = 0;
        velocity[i * 3 + 1] = 0;
        velocity[i * 3 + 2] = 0;

        // Particle color (black by default)
        const colorIntensity = 0.1 + Math.random() * 0.1; // Lower intensity for black
        
        // Make particles black
        colors[i * 3] = colorIntensity;     // Red
        colors[i * 3 + 1] = colorIntensity; // Green
        colors[i * 3 + 2] = colorIntensity; // Blue

        // Particle size
        sizes[i] = particleSize * (0.8 + Math.random() * 0.4);
    }

    // Add attributes to geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocity, 3));

    // Create custom shader material for displaying crosses instead of particles
    const vertexShader = `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vDistance;
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Calculate distance from camera for edge enhancement
            vDistance = 1.0 - min(1.0, length(position.xy) / ${sphereRadius.toFixed(1)});
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    
    const fragmentShader = `
        varying vec3 vColor;
        varying float vDistance;
        
        void main() {
            // Transform coordinates from 0 to 1
            vec2 uv = vec2(gl_PointCoord.x, gl_PointCoord.y);
            
            // Create a sharper cross with thinner lines
            float thickness = 0.15;
            float crossX = abs(uv.x - 0.5) < thickness * 0.5 ? 1.0 : 0.0;
            float crossY = abs(uv.y - 0.5) < thickness * 0.5 ? 1.0 : 0.0;
            float cross = max(crossX * step(thickness, abs(uv.y * 2.0 - 1.0)), 
                             crossY * step(thickness, abs(uv.x * 2.0 - 1.0)));
            
            // Add a glow effect around the cross
            float glow = (1.0 - length(uv - 0.5) * 2.0) * 0.5;
            
            if (cross < 0.1 && glow < 0.05) discard;
            
            // Combine cross and glow effect
            float brightness = cross > 0.5 ? 1.0 : glow;
            
            // Make the color black
            vec3 finalColor = vec3(0.0, 0.0, 0.0); // Pure black
            
            // Enhance brightness at edges for visible sphere edge
            brightness *= (1.0 + vDistance * 0.5);
            
            gl_FragColor = vec4(finalColor, brightness);
        }
    `;
    
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // Changed to additive blending for better glow effect
    });

    // Create particle system
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Invisible sphere for collision detection
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
    });
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Initialize objects for intersection detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Add event handlers
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    
    console.log("Three.js scene initialized");

    // Make accessible globally
    window.particleSystem = particleSystem;
    window.sphere = sphere;
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mouse movement handler
function onMouseMove(event) {
    // Convert mouse coordinates to normalized coordinates from -1 to 1
    // Adjust for the panel offset
    const offsetX = window.panelOffset || 0;
    
    // Calculate mouse position with adjustment for sphere position
    if (offsetX !== 0) {
        // When panel is open, adjust mouse X coordinate to match visual position
        const windowHalfX = window.innerWidth / 2;
        const adjustedClientX = event.clientX - offsetX;
        mouse.x = (adjustedClientX / window.innerWidth) * 2 - 1;
    } else {
        // Normal behavior when panel is closed
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    }
    
    // Y coordinate stays the same
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Update particle positions
function updateParticles() {
    // Increment time for wave animation
    time += 0.05;
    sideWavesTime += 0.05;
    
    // Get intersection point of ray with invisible sphere
    raycaster.setFromCamera(mouse, camera);
    
    // Create a temporary sphere that matches the current position of our sphere
    // This ensures raycasting works correctly when the sphere moves
    const tempSphere = new THREE.Mesh(
        new THREE.SphereGeometry(sphereRadius, 32, 32),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    
    // Copy position and rotation from the actual sphere
    tempSphere.position.copy(sphere.position);
    tempSphere.rotation.copy(sphere.rotation);
    
    // Check for intersections with the temp sphere
    const intersects = raycaster.intersectObject(tempSphere);

    // Get attributes
    const positions = particleSystem.geometry.attributes.position.array;
    const originalPositions = particleSystem.geometry.attributes.originalPosition.array;
    const velocities = particleSystem.geometry.attributes.velocity.array;
    const colors = particleSystem.geometry.attributes.color.array;
    const sizes = particleSystem.geometry.attributes.size.array;

    // Wave center - either intersection point or null
    let waveCenter = null;
    let intersectionPoint = new THREE.Vector3();

    if (intersects.length > 0) {
        // Use the intersection point for wave effects
        intersectionPoint.copy(intersects[0].point);
        waveCenter = intersectionPoint;
        
        // Normal at the intersection point (direction from sphere center)
        const normal = new THREE.Vector3()
            .copy(intersectionPoint)
            .normalize();
        
        // Create two perpendicular vectors for side waves
        const tangent1 = new THREE.Vector3(1, 0, 0);
        if (Math.abs(normal.dot(tangent1)) > 0.9) {
            tangent1.set(0, 1, 0);
        }
        tangent1.crossVectors(normal, tangent1).normalize();
        
        const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();
        
        // Check if there was a previous intersection point
        if (lastIntersectionPoint !== null) {
            // If mouse moved, create directed wave in movement direction
            const movementVector = new THREE.Vector3().subVectors(intersectionPoint, lastIntersectionPoint);
            if (movementVector.length() > 0.1) {
                // Normalize movement
                movementVector.normalize();
            }
        }

        // Update particle positions
        for (let i = 0; i < particleCount; i++) {
            const index = i * 3;
            const particlePos = new THREE.Vector3(
                positions[index],
                positions[index + 1],
                positions[index + 2]
            );

            const origPos = new THREE.Vector3(
                originalPositions[index],
                originalPositions[index + 1],
                originalPositions[index + 2]
            );

            // Distance from particle to intersection point
            const distance = particlePos.distanceTo(intersectionPoint);

            // Main mouse interaction effect
            if (distance < attractionRadius) {
                // Attraction force inversely proportional to distance
                const force = 1 - distance / attractionRadius;
                
                // Pull particle in normal direction
                const displacement = Math.max(0, maxDisplacement * force);
                
                // New position considering original position and normal displacement
                const newPos = origPos.clone().add(
                    normal.clone().multiplyScalar(displacement)
                );

                // Set new velocity directed towards new position
                velocities[index] = (newPos.x - positions[index]) * waveSpeed;
                velocities[index + 1] = (newPos.y - positions[index + 1]) * waveSpeed;
                velocities[index + 2] = (newPos.z - positions[index + 2]) * waveSpeed;

                // Update particle color during interaction (dark green)
                const colorIntensity = 0.3 * force;
                colors[index] = 0.0;                  // No red
                colors[index + 1] = colorIntensity;   // Little green
                colors[index + 2] = 0.0;              // No blue
                
                // Increase particle size during interaction
                sizes[i] = particleSize * (1.0 + force * 0.5);
            } else {
                // Gradually return to black
                colors[index] = 0.1 + Math.random() * 0.1;     // Dark
                colors[index + 1] = 0.1 + Math.random() * 0.1; // Dark
                colors[index + 2] = 0.1 + Math.random() * 0.1; // Dark
                
                // Return size to original
                sizes[i] = Math.max(particleSize, sizes[i] - 0.05);
            }
            
            // Wave effect (propagates from intersection point)
            if (distance < waveRadius) {
                // Create wave effect dependent on distance and time
                const wavePhase = distance / 10.0 - time * waveFrequency;
                const waveValue = Math.sin(wavePhase) * Math.cos(wavePhase * 0.5);
                
                // Damping coefficient with distance
                const damping = 1.0 - distance / waveRadius;
                
                // Apply wave displacement in direction from center to particle
                const waveDirection = new THREE.Vector3()
                    .subVectors(particlePos, intersectionPoint)
                    .normalize();
                
                // Add wave movement
                const waveDisplacement = waveValue * waveAmplitude * damping;
                
                positions[index] += waveDirection.x * waveDisplacement;
                positions[index + 1] += waveDirection.y * waveDisplacement;
                positions[index + 2] += waveDirection.z * waveDisplacement;
                
                // Set color to black for moving particles
                const waveColorFactor = Math.abs(waveValue) * damping;
                colors[index] = 0.1;  // Almost black
                colors[index + 1] = 0.1;
                colors[index + 2] = 0.1;
            } else {
                // Gradually reduce velocity over time
                velocities[index] *= 0.95;
                velocities[index + 1] *= 0.95;
                velocities[index + 2] *= 0.95;

                // Return color to gray
                colors[index] = 0.5;  // Medium gray
                colors[index + 1] = 0.5;
                colors[index + 2] = 0.5;
                
                // Return size to original
                sizes[i] = Math.max(particleSize, sizes[i] - 0.05);
            }

            // Side waves that appear and disappear
            if (distance < waveRadius * 1.5) {
                // Projections of particle position relative to side directions
                const relativePos = new THREE.Vector3().subVectors(particlePos, intersectionPoint);
                const dot1 = relativePos.dot(tangent1);
                const dot2 = relativePos.dot(tangent2);
                
                // Create periodic waves on both sides of cursor
                // First side wave
                const sideWave1 = Math.sin(sideWavesTime * sideWaveSpeed - dot1 * 0.02) * 
                               Math.exp(-Math.pow(dot2 / (waveRadius * sideWaveWidth), 2)) * 
                               Math.exp(-Math.pow(distance / waveRadius, 2));
                
                // Second side wave
                const sideWave2 = Math.sin(sideWavesTime * sideWaveSpeed * 0.7 + dot2 * 0.03) * 
                               Math.exp(-Math.pow(dot1 / (waveRadius * sideWaveWidth), 2)) * 
                               Math.exp(-Math.pow(distance / waveRadius, 2));
                
                // Modulate wave appearance over time
                const sideWaveMod1 = Math.sin(sideWavesTime * sideWaveFrequency) * 0.5 + 0.5;
                const sideWaveMod2 = Math.sin(sideWavesTime * sideWaveFrequency + Math.PI) * 0.5 + 0.5;
                
                // Apply displacement from side waves
                const sideDisplacement1 = sideWave1 * sideWaveIntensity * sideWaveMod1;
                const sideDisplacement2 = sideWave2 * sideWaveIntensity * sideWaveMod2;
                
                // Apply displacement in normal direction (deep into sphere and outward)
                positions[index] += normal.x * sideDisplacement1;
                positions[index + 1] += normal.y * sideDisplacement1;
                positions[index + 2] += normal.z * sideDisplacement1;
                
                positions[index] += normal.x * sideDisplacement2;
                positions[index + 1] += normal.y * sideDisplacement2;
                positions[index + 2] += normal.z * sideDisplacement2;
                
                // Also change color based on side waves - make them black
                const sideWaveColorIntensity = (Math.abs(sideDisplacement1) + Math.abs(sideDisplacement2)) * 0.05;
                if (sideWaveColorIntensity > 0.01) {
                    colors[index] = 0.1;  // Almost black
                    colors[index + 1] = 0.1;
                    colors[index + 2] = 0.1;
                }
            }
            
            // Apply velocity to position
            positions[index] += velocities[index];
            positions[index + 1] += velocities[index + 1];
            positions[index + 2] += velocities[index + 2];

            // Return particle to original position
            const returnVector = new THREE.Vector3(
                originalPositions[index] - positions[index],
                originalPositions[index + 1] - positions[index + 1],
                originalPositions[index + 2] - positions[index + 2]
            );

            if (returnVector.length() > 0.01) {
                positions[index] += returnVector.x * returnSpeed;
                positions[index + 1] += returnVector.y * returnSpeed;
                positions[index + 2] += returnVector.z * returnSpeed;
            }
        }

        // Save current intersection point for next frame
        lastIntersectionPoint = intersectionPoint.clone();
    } else {
        // If no intersection, reset lastIntersectionPoint
        lastIntersectionPoint = null;

        // Gently return all particles to their places
        for (let i = 0; i < particleCount; i++) {
            const index = i * 3;
            
            // Gently reduce velocity
            velocities[index] *= 0.9;
            velocities[index + 1] *= 0.9;
            velocities[index + 2] *= 0.9;
            
            // Apply velocity
            positions[index] += velocities[index];
            positions[index + 1] += velocities[index + 1];
            positions[index + 2] += velocities[index + 2];
            
            // Return particle to original position
            positions[index] += (originalPositions[index] - positions[index]) * returnSpeed;
            positions[index + 1] += (originalPositions[index + 1] - positions[index + 1]) * returnSpeed;
            positions[index + 2] += (originalPositions[index + 2] - positions[index + 2]) * returnSpeed;
            
            // Set static particles to gray
            colors[index] = 0.5;     // Medium gray
            colors[index + 1] = 0.5;
            colors[index + 2] = 0.5;
            
            // Return size to original
            sizes[i] = Math.max(particleSize, sizes[i] - 0.05);
        }
    }

    // Mark attributes as needing update
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.velocity.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
    particleSystem.geometry.attributes.size.needsUpdate = true;
}

// Animation function - don't modify x position here
function animate() {
    requestAnimationFrame(animate);
    
    // Time for floating animation
    const time = Date.now() * 0.001; // Convert to seconds
    
    // Gentle floating motion - apply only to Y and Z, not X
    const floatY = Math.sin(time * 0.5) * 5; // Up and down motion
    const floatZ = Math.cos(time * 0.4) * 2; // Slight forward-backward
    
    // Very slow rotation
    const rotationY = Math.sin(time * 0.2) * 0.02; // Very subtle rotation
    const rotationX = Math.cos(time * 0.15) * 0.01;
    
    // Apply Y and Z floating motion but preserve X position
    // (X position is controlled by the panel toggle)
    particleSystem.position.y = floatY;
    particleSystem.position.z = floatZ;
    
    // Apply rotation
    particleSystem.rotation.y = rotationY;
    particleSystem.rotation.x = rotationX;
    
    // Keep invisible sphere in sync
    sphere.position.copy(particleSystem.position);
    sphere.rotation.copy(particleSystem.rotation);
    
    // Update particle positions
    updateParticles();
    
    // Render scene
    renderer.render(scene, camera);
}