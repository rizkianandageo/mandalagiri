import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import maplibregl from 'maplibre-gl';

export function createHiker3DLayer(mapInstance, modelUrl) {
    return {
        id: 'hiker-3d-model',
        type: 'custom',
        renderingMode: '3d',
        
        onAdd: function (map, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();
            
            // Pencahayaan agar model tidak gelap
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
            directionalLight.position.set(100, 100, 100).normalize();
            this.scene.add(directionalLight);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight2.position.set(-100, -100, -100).normalize();
            this.scene.add(directionalLight2);
            
            this.mixer = null;
            this.model = null;
            this.lastTime = performance.now();
            
            // Load Model GLB
            const loader = new GLTFLoader();
            loader.load(modelUrl, (gltf) => {
                this.model = gltf.scene;
                this.scene.add(this.model);
                
                // Mainkan animasi pertama jika ada
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    this.mixer.clipAction(gltf.animations[0]).play();
                }
            }, undefined, (error) => {
                console.error("Gagal memuat model 3D pendaki:", error);
            });
            
            this.map = map;
            
            // Integrasi WebGL Renderer Three.js ke canvas MapLibre
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true,
                alpha: true
            });
            this.renderer.autoClear = false;
        },
        
        render: function (gl, matrix) {
            if (!this.model) return;
            
            // Mengambil posisi dan rotasi terbaru dari global window (di-update oleh animate loop MapComponent)
            const lngLat = window.mapConsole.hiker3DPosition;
            if (!lngLat) return;

            const bearing = window.mapConsole.hiker3DRotation || 0; 
            
            // Konversi ke koordinat MapLibre (Mercator) dengan dukungan elevasi terrain
            let elevation = 0;
            if (this.map.queryTerrainElevation) {
                // Tambahkan sedikit offset misal +5 meter agar kaki tidak terpotong kontur
                elevation = (this.map.queryTerrainElevation(lngLat) || 0) + 5; 
            }
            const mercatorOrigin = maplibregl.MercatorCoordinate.fromLngLat(lngLat, elevation);
            
            // Hitung skala berdasarkan meter riil agar ukurannya konsisten
            // Perbesar ukuran model agar terlihat jelas dari atas (misal 500 meter)
            const meterScale = mercatorOrigin.meterInMercatorCoordinateUnits();
            
            // Dinamiskan scale berdasarkan zoom level agar tetap terlihat saat zoom out
            const currentZoom = this.map.getZoom();
            const zoomScaleFactor = Math.pow(2, 14 - currentZoom); // 1 di zoom 14, membesar saat dizoom out
            const visualSize = 1500 * Math.max(1, zoomScaleFactor); // Ukuran base 1500m di zoom <=14
            
            const scale = meterScale * visualSize;

            const m = new THREE.Matrix4().fromArray(matrix);
            
            // Buat matriks transformasi untuk posisi, skala, dan rotasi model
            const l = new THREE.Matrix4()
                .makeTranslation(mercatorOrigin.x, mercatorOrigin.y, mercatorOrigin.z)
                .scale(new THREE.Vector3(scale, scale, scale))
                // Sesuaikan sumbu Z (Heading) ke rotasi maplibre (-bearing)
                .multiply(new THREE.Matrix4().makeRotationZ(-bearing * Math.PI / 180)) 
                // Model GLTF umumnya menghadap Z+ dengan Y+ ke atas. 
                // Di MapLibre, Z+ adalah elevasi (ke atas langit).
                .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); 
                
            this.camera.projectionMatrix = m.multiply(l);
            
            // Update animasi tanpa THREE.Clock
            if (this.mixer) {
                const now = performance.now();
                if (!this.lastTime) this.lastTime = now;
                let delta = (now - this.lastTime) / 1000;
                if (delta > 0.1) delta = 0.1; // clamp delta
                this.lastTime = now;
                this.mixer.update(delta);
            }
            
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            
            // Terus render ulang untuk animasi mulus (framerate maksimum)
            if (window.mapConsole.isFlying) {
                this.map.triggerRepaint();
            }
        }
    };
}
