import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import maplibregl from 'maplibre-gl';

export function createHiker3DLayer(mapInstance, modelUrl) {
    return {
        id: 'hiker-3d-model',
        type: 'custom',
        renderingMode: '3d',

        onAdd: function (map, gl) {
            this.map = map;

            // Kamera Three.js — kita akan memanipulasi projectionMatrix-nya langsung
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();

            // Pencahayaan agar model tidak gelap
            const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
            this.scene.add(ambientLight);

            const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
            dirLight.position.set(1, 1, 1).normalize();
            this.scene.add(dirLight);

            this.mixer = null;
            this.model = null;
            this.lastTime = performance.now();
            this.frameCount = 0;

            // Load Model GLB
            const loader = new GLTFLoader();
            loader.load(modelUrl, (gltf) => {
                this.model = gltf.scene;

                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.frustumCulled = false;
                        if (child.material) {
                            // Pastikan material terlihat solid dan mencolok
                            // Hapus transparansi agar tidak tembus pandang
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                            child.material.depthTest = true;
                            child.material.depthWrite = true;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                this.scene.add(this.model);

                // Mainkan animasi pertama jika ada
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    this.mixer.clipAction(gltf.animations[0]).play();
                }

                console.log('Hiker3D: Model GLB berhasil dimuat!');
            }, undefined, (error) => {
                console.error('Gagal memuat model 3D pendaki:', error);
            });

            // Integrasi WebGL Renderer Three.js ke canvas MapLibre
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true,
            });
            this.renderer.autoClear = false;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        },

        render: function (gl, args) {
            if (!this.model) return;

            // Ambil posisi dan rotasi dari global state (di-update oleh MapComponent)
            const lngLat = window.mapConsole?.hiker3DPosition;
            if (!lngLat) return;

            const bearing = window.mapConsole?.hiker3DRotation || 0;

            // Dapatkan elevasi terrain di titik model
            let elevation = 0;
            if (this.map.queryTerrainElevation) {
                const terrainElev = this.map.queryTerrainElevation(lngLat) || 0;
                // Tambahkan offset agar model berada di ATAS terrain, tidak menembus
                // Offset dalam meter — disesuaikan dengan tinggi model (modelSizeMeters)
                const elevationOffset = 30; // meter di atas terrain
                elevation = terrainElev + elevationOffset;
            }

            // Konversi ke Mercator koordinat dengan elevasi
            const mercator = maplibregl.MercatorCoordinate.fromLngLat(lngLat, elevation);

            // meterInMercatorCoordinateUnits() = faktor konversi meter → Mercator units
            const meterScale = mercator.meterInMercatorCoordinateUnits();

            // Ukuran visual model dalam meter (dibesarkan agar terlihat dari ketinggian)
            const modelSizeMeters = 200;
            const scale = meterScale * modelSizeMeters;

            // ---------------------------------------------------------------
            // POLA RESMI MapLibre + Three.js:
            // "args.defaultProjectionData.mainMatrix" adalah MVP matrix dari MapLibre
            // yang sudah merupakan produk: Projection × View × (identitas)
            // Kita hanya perlu kalikan dengan model transform matrix (L)
            // dan set hasilnya ke camera.projectionMatrix.
            // Ini persis pola dari dokumentasi resmi MapLibre.
            // ---------------------------------------------------------------

            // Gunakan matrix MVP yang diberikan MapLibre (format column-major Float64 / Float32)
            // args bisa berupa matrix langsung (versi lama) atau objek (versi baru)
            let mvpArray;
            if (Array.isArray(args) || args instanceof Float64Array || args instanceof Float32Array) {
                // API lama: render(gl, matrix)
                mvpArray = args;
            } else if (args && args.defaultProjectionData) {
                // API baru: render(gl, options) 
                mvpArray = args.defaultProjectionData.mainMatrix;
            } else {
                mvpArray = args;
            }

            const m = new THREE.Matrix4().fromArray(mvpArray);

            // Model Transform Matrix (L): posisi, skala, rotasi
            // Perhatian: MapLibre menggunakan koordinat tangan-kiri (Y ke bawah di layar),
            // sedangkan Three.js tangan-kanan (Y ke atas). Untuk GLTF, kita rotasi sumbu X 90°
            // agar model berdiri tegak (GLTF: Y-up → MapLibre: Z-up).
            // TIDAK menggunakan -scale Y karena akan menyebabkan winding order terbalik.
            const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
            const rotationZ = new THREE.Matrix4().makeRotationZ((bearing) * Math.PI / 180);

            const l = new THREE.Matrix4()
                .makeTranslation(mercator.x, mercator.y, mercator.z)
                .scale(new THREE.Vector3(scale, scale, scale))
                .multiply(rotationX)
                .multiply(rotationZ);

            // Set camera matrix = MVP dari MapLibre × Model transform
            this.camera.projectionMatrix = m.multiply(l);
            this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();

            // Debug log setiap 60 frame
            this.frameCount++;
            if (this.frameCount % 60 === 0) {
                const currentZoom = this.map.getZoom();
                console.log('Hiker3D Debug: rendering model di', lngLat,
                    'elevation:', elevation, 'scale:', scale, 'zoom:', currentZoom,
                    'mercator:', mercator.x, mercator.y, mercator.z);
            }

            // Update animasi
            if (this.mixer) {
                const now = performance.now();
                if (!this.lastTime) this.lastTime = now;
                let delta = (now - this.lastTime) / 1000;
                if (delta > 0.1) delta = 0.1;
                this.lastTime = now;
                this.mixer.update(delta);
            }

            // Reset state WebGL Three.js agar tidak crash dengan state MapLibre
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
            // Jangan restore state — biarkan MapLibre lanjut dengan state-nya sendiri

            // Trigger repaint selama animasi berlangsung
            if (window.mapConsole?.isFlying) {
                this.map.triggerRepaint();
            }
        }
    };
}
