// app.js
let scene, camera, renderer, globe, controls;
let points = [];
let pointLifetimes = {};
const pointDuration = 10000; // 10 seconds
let paused = false;
let playbackSpeed = 5;
let stats = {
    total: 0,
    suspicious: 0,
    locations: {}
};

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Globe
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const texture = new THREE.TextureLoader().load('earth_texture.jpg');
    const material = new THREE.MeshBasicMaterial({ map: texture });
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);
    
    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.02,
        transparent: true
    });
    
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resetBtn').addEventListener('click', resetView);
    document.getElementById('speedControl').addEventListener('input', updateSpeed);
    
    // Start fetching data
    fetchData();
    setInterval(fetchData, 1000);
}

function fetchData() {
    if (paused) return;
    
    fetch('http://localhost:5000/api/packages')
        .then(response => response.json())
        .then(data => processPackages(data))
        .catch(err => console.error('Error fetching data:', err));
}

function processPackages(packages) {
    packages.forEach(pkg => {
        // Skip if we've already processed this package
        if (pointLifetimes[pkg.ip_address]) return;
        
        // Convert lat/long to 3D position
        const lat = parseFloat(pkg.Latitude);
        const lng = parseFloat(pkg.Longitude);
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        
        const radius = 1.05; // Slightly above globe surface
        const x = - (radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        // Create point
        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z], 3));
        
        const color = parseFloat(pkg.suspicious) >= 0.5 ? 0xFF0000 : 0x00FF00;
        const pointMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.05,
            transparent: true
        });
        
        const point = new THREE.Points(pointGeometry, pointMaterial);
        scene.add(point);
        points.push(point);
        pointLifetimes[pkg.ip_address] = {
            timestamp: Date.now(),
            point: point,
            suspicious: parseFloat(pkg.suspicious) >= 0.5
        };
        
        // Update stats
        updateStats(pkg);
    });
}

function updateStats(pkg) {
    stats.total++;
    if (pkg.suspicious === '1') stats.suspicious++;
    
    const locationKey = `${pkg.Latitude},${pkg.Longitude}`;
    stats.locations[locationKey] = (stats.locations[locationKey] || 0) + 1;
    
    // Update UI
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('suspiciousCount').textContent = stats.suspicious;
    
    // Update top locations
    const topLocations = Object.entries(stats.locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const locationsList = document.getElementById('topLocations');
    locationsList.innerHTML = '';
    topLocations.forEach(([loc, count]) => {
        const li = document.createElement('li');
        li.textContent = `${loc} (${count})`;
        locationsList.appendChild(li);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!paused) {
        // Update point lifetimes
        const currentTime = Date.now();
        for (const [ip, data] of Object.entries(pointLifetimes)) {
            const age = currentTime - data.timestamp;
            const normalizedAge = Math.min(age / pointDuration, 1);
            
            if (age > pointDuration) {
                // Remove old points
                scene.remove(data.point);
                points = points.filter(p => p !== data.point);
                delete pointLifetimes[ip];
            } else {
                // Fade out points as they age
                data.point.material.opacity = 1 - normalizedAge;
                if (data.suspicious) {
                    // Make suspicious points pulse
                    data.point.material.size = 0.05 + Math.sin(currentTime * 0.005) * 0.03;
                }
            }
        }
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function togglePause() {
    paused = !paused;
    document.getElementById('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
}

function resetView() {
    camera.position.set(0, 0, 2.5);
    controls.reset();
}

function updateSpeed(e) {
    playbackSpeed = parseInt(e.target.value);
}

// Start the animation loop
animate();