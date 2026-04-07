const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1000);
camera.position.set(0, 0, 3); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.08;
controls.minDistance = 0.01; 
controls.maxDistance = Infinity; 

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dLight = new THREE.DirectionalLight(0xffffff, 0.9);
dLight.position.set(5, 10, 7);
scene.add(dLight);
const bLight = new THREE.DirectionalLight(0x88bbff, 0.6);
bLight.position.set(-5, -5, -5);
scene.add(bLight);

const loader = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
// المسار الأكثر استقراراً المطابق لنسخة r128 تماماً
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
loader.setDRACOLoader(dracoLoader);

let loadedModel; 
let activeTooth = null; 
let isXRayMode = false;
let hiddenParts = []; 

const boneTranslation = {
    "Temporale": "العظم الصدغي", "Mascella": "الفك العلوي", "Mandibola": "الفك السفلي", "Frontale": "العظم الجبهي",
    "Parietale": "العظم الجداري", "Occipitale": "العظم القذالي", "Zigomatico": "عظم الوجنة", "Naso": "عظم الأنف",
    "Sphenoid": "العظم الوتدي", "Etmoide": "العظم الغربالي", "Lacrimale": "العظم الدمعي"
};

loader.load(
    'skull.glb', 
    function (gltf) {
        loadedModel = gltf.scene;
        loadedModel.position.set(0, 0, 0);
        
        loadedModel.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone(); 
                child.material.transparent = true;
                child.material.opacity = 1;
                if(!isFdiNumber(child.name)) { child.material.color.setHex(0xe8f4f8); }
                child.userData.originalPosition = child.position.clone();
                child.userData.isBone = !isFdiNumber(child.name);
            }
        });

        scene.add(loadedModel);
        document.getElementById('loading').style.display = 'none';
    },
    function (xhr) {
        // يمكن إضافة شريط تقدم هنا إن لزم الأمر
    },
    function (error) {
        console.error("خطأ تقني:", error);
        document.querySelector('.spinner').style.display = 'none';
        document.getElementById('loading-text').innerText = 'فشل التحميل!';
        const errBox = document.getElementById('error-msg');
        errBox.style.display = 'block';
        errBox.innerText = 'الخطأ: ' + error.message + '\nتأكد أن ملف skull.glb موجود في المجلد E:\\yorick\\ وأن الخادم المحلي يعمل.';
    }
);

function isFdiNumber(name) {
    const num = parseInt(name);
    return !isNaN(num) && num >= 11 && num <= 48;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (event) => {
    if(event.target.closest('#ui-container') || event.target.closest('#restore-container') || document.getElementById('fullscreen-overlay').style.display === 'flex') return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    if (loadedModel) {
        const visibleObjects = [];
        loadedModel.traverse(child => { if(child.isMesh && child.visible) visibleObjects.push(child); });
        
        const intersects = raycaster.intersectObjects(visibleObjects, false);
        
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const name = clickedMesh.name;
            const toothNumber = parseInt(name);

            if (isFdiNumber(name)) {
                handleToothClick(clickedMesh, toothNumber);
            } else {
                handleBoneClick(clickedMesh);
            }
        }
    }
});

function handleBoneClick(mesh) {
    let arabicName = "عظم (" + mesh.name + ")";
    for (const [key, value] of Object.entries(boneTranslation)) {
        if (mesh.name.includes(key)) { arabicName = value; break; }
    }

    mesh.visible = false;
    hiddenParts.push(mesh);

    const container = document.getElementById('restore-container');
    const btn = document.createElement('button');
    btn.className = 'restore-btn';
    btn.innerHTML = `&#8634; إعادة ` + arabicName;
    btn.onclick = function() {
        mesh.visible = true; 
        if(isXRayMode) mesh.material.opacity = 0.15;
        this.remove(); 
        hiddenParts = hiddenParts.filter(p => p !== mesh);
    };
    container.appendChild(btn);
}

function handleToothClick(mesh, toothNumber) {
    if(activeTooth) closeFullscreen();

    activeTooth = mesh;
    activeTooth.position.z += 1.5; 
    activeTooth.position.y -= 0.5;

    const lastDigit = toothNumber % 10;
    let imageName = "";

    if (lastDigit === 1 || lastDigit === 2) {
        imageName = "kat3.png";
    } else if (lastDigit === 3) {
        imageName = "nab.png";
    } else if (lastDigit === 4 || lastDigit === 5) {
        imageName = "thahk.png";
    } else if (lastDigit >= 6 && lastDigit <= 8) {
        imageName = lastDigit === 8 ? "3akl.png" : "thrs.png";
    }

    document.getElementById('fullscreen-img').src = "images/" + imageName;
    document.getElementById('fullscreen-overlay').style.display = 'flex';
}

window.closeFullscreen = function() {
    document.getElementById('fullscreen-overlay').style.display = 'none';
    if (activeTooth) {
        activeTooth.position.copy(activeTooth.userData.originalPosition);
        activeTooth = null;
    }
};

window.resetModel = function() {
    closeFullscreen();
    if (loadedModel) {
        loadedModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true; 
                if (child.userData.originalPosition) child.position.copy(child.userData.originalPosition);
                if (isXRayMode && child.userData.isBone) child.material.opacity = 0.15;
                else child.material.opacity = 1;
            }
        });
    }
    hiddenParts = [];
    document.getElementById('restore-container').innerHTML = '';
};

window.toggleXRay = function(btn) {
    isXRayMode = !isXRayMode;
    if(isXRayMode) {
        btn.classList.add('active'); btn.innerHTML = "&#128065; إيقاف وضع الأشعة";
    } else {
        btn.classList.remove('active'); btn.innerHTML = "وضع الأشعة (X-Ray)";
    }

    if (loadedModel) {
        loadedModel.traverse((child) => {
            if (child.isMesh && child.userData.isBone) {
                child.material.opacity = isXRayMode ? 0.15 : 1;
            }
        });
    }
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update(); 
    renderer.render(scene, camera);
}
animate();