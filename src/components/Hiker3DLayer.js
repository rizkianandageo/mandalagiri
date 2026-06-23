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

                // Hitung bounding box model untuk menemukan posisi kaki (feet)
                // agar origin model tepat di kaki, bukan di tengah badan.
                // Model ini non-standard: kaki di +Y, kepala di -Y dalam GLTF space.
                // Feet offset = -box.max.y agar kaki bergerak ke Y=0 (origin).
                const box = new THREE.Box3().setFromObject(this.model);
                // Mixamo/standard Y-up: kaki di min.y, kepala di max.y
                this.modelFootOffset = -box.min.y; // geser kaki ke Y=0
                this.modelGltfHeight = box.max.y - box.min.y; // tinggi asli model dalam unit GLTF
                console.log('Hiker3D: BBox Y:', box.min.y.toFixed(2), 'to', box.max.y.toFixed(2),
                    '| footOffset:', this.modelFootOffset.toFixed(2),
                    '| GLTF height:', this.modelGltfHeight.toFixed(2));

                // Mainkan animasi pertama jika ada
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('Hiker3D: Ditemukan', gltf.animations.length, 'animasi:',
                        gltf.animations.map(a => a.name).join(', '));
                    this.mixer = new THREE.AnimationMixer(this.model);
                    // Mixamo export biasanya nama animasinya "mixamo.com" atau sesuai nama yang dipilih
                    const action = this.mixer.clipAction(gltf.animations[0]);
                    action.setLoop(THREE.LoopRepeat); // loop tanpa henti
                    action.play();
                    console.log('Hiker3D: Memainkan animasi:', gltf.animations[0].name);
                } else {
                    console.warn('Hiker3D: Tidak ada animasi di file GLB ini!');
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

            // Ambil posisi dan bearing dari global state (di-update setiap frame oleh MapComponent)
            const rawLngLat = window.mapConsole?.hiker3DPosition;
            if (!rawLngLat) return;

            // BUG FIX: MapLibre setData() untuk jalur merah bersifat ASYNCHRONOUS (diproses di Web Worker).
            // Biasanya memakan waktu 2-3 frame sebelum jalur baru ter-render di layar.
            // Karena itu, jika model 3D menggunakan posisi saat ini (frame N), ia akan mendahului 
            // jalur merah yang baru ter-render sampai frame N-3!
            // Solusi: Kita buat buffer 3-frame untuk menunda posisi model 3D agar sinkron dengan jalur.
            if (!this.posBuffer) this.posBuffer = [];
            this.posBuffer.push([...rawLngLat]);
            if (this.posBuffer.length > 3) {
                this.posBuffer.shift();
            }
            const lngLat = this.posBuffer[0]; // Gunakan posisi dari 3 frame yang lalu

            // Model bearing = targetBearing (arah jalur aktual, bukan camera bearing yang smoothed)
            const bearing = window.mapConsole?.hiker3DRotation || 0;

            // Dapatkan elevasi terrain di titik model
            let elevation = 0;
            if (this.map.queryTerrainElevation) {
                // Jangan tambah offset elevasi! Offset membuat model "melayang" yang 
                // pada sudut kamera miring terlihat seperti bergeser dari garis jalur.
                elevation = this.map.queryTerrainElevation(lngLat) || 0;
            }

            // Konversi ke Mercator koordinat dengan elevasi
            const mercator = maplibregl.MercatorCoordinate.fromLngLat(lngLat, elevation);

            // meterInMercatorCoordinateUnits() = faktor konversi meter → Mercator units
            const meterScale = mercator.meterInMercatorCoordinateUnits();

            // Ukuran visual model: di zoom 13.2 resolusi layar ≈ 16m/pixel.
            // Model harus minimal 80m agar terlihat jelas (5+ pixel tinggi di layar).
            // Scale ini bersifat fixed dalam meter world-space, tidak bergantung unit GLTF.
            // Jika model terlihat terlalu besar/kecil, sesuaikan nilai modelSizeMeters.
            const modelSizeMeters = 80;
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

            // POLA STANDAR MAPBOX/MAPLIBRE CUSTOM LAYER 3D:
            // 1. feetTranslation: Geser origin ke kaki (jika model origin di tengah)
            // 2. rotationY: Putar heading/bearing (karena model asli adalah Y-up)
            // 3. rotationX: Putar 90 derajat agar Y-up menjadi Z-up (Mapbox world)
            // 4. scale: Kalikan Y dengan -1 karena koordinat Mapbox adalah Left-Handed
            // 5. translate: Pindahkan ke posisi Mercator di dunia

            // Bearing diubah ke radian. Model Mixamo (+Z depan) perlu offset jika 
            // tidak menghadap arah yang benar secara default.
            // Mapbox bearing adalah searah jarum jam dari Utara.
            const bearingRad = bearing * (Math.PI / 180);
            
            // Kita coba tanpa offset dulu. Jika model berjalan mundur/samping, 
            // kita bisa tambahkan Math.PI atau Math.PI/2 di sini.
            // Update: Model terbalik (jalan mundur), jadi kita tambahkan offset 180 derajat (Math.PI)
            const modelForwardOffset = Math.PI; 
            const rotationY = new THREE.Matrix4().makeRotationY(-bearingRad + modelForwardOffset);
            const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
            
            const footOffset = this.modelFootOffset !== undefined ? this.modelFootOffset : 0;
            const feetTranslation = new THREE.Matrix4().makeTranslation(0, footOffset, 0);

            // Perhatikan scale Y menggunakan negatif (-scale) sesuai standar Mapbox Left-Handed
            const l = new THREE.Matrix4()
                .makeTranslation(mercator.x, mercator.y, mercator.z)
                .scale(new THREE.Vector3(scale, -scale, scale))
                .multiply(rotationX)
                .multiply(rotationY)
                .multiply(feetTranslation);

            // Set camera matrix = MVP dari MapLibre × Model transform
            this.camera.projectionMatrix = m.multiply(l);
            this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();

            // Debug log setiap 300 frame (lebih jarang agar console tidak penuh)
            this.frameCount++;
            if (this.frameCount % 300 === 0) {
                const currentZoom = this.map.getZoom();
                console.log('Hiker3D Debug: pos', lngLat, '| elev:', Math.round(elevation), 'm | zoom:', currentZoom.toFixed(1));
            }

            // Update animasi — pause/resume berdasarkan flag hikerPaused dari MapComponent
            if (this.mixer) {
                const isPaused = window.mapConsole?.hikerPaused === true;
                if (isPaused) {
                    // Pause: set timeScale = 0 agar animasi beku tapi tidak di-reset
                    this.mixer.timeScale = 0;
                } else {
                    // Resume: kembalikan ke kecepatan normal
                    this.mixer.timeScale = 1;
                    const now = performance.now();
                    if (!this.lastTime) this.lastTime = now;
                    let delta = (now - this.lastTime) / 1000;
                    if (delta > 0.1) delta = 0.1;
                    this.lastTime = now;
                    this.mixer.update(delta);
                }
                // Update lastTime selalu, agar saat resume tidak melompat
                if (isPaused) this.lastTime = performance.now();
            }

            // Reset state WebGL Three.js agar tidak crash dengan state MapLibre
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            // TIDAK menggunakan triggerRepaint() — rendering sudah didriving oleh:
            // 1. jumpTo() di MapComponent (60fps selama navigasi)
            // 2. setData completion trigger dari MapLibre (saat trail update)
            // Kedua sumber render ini sudah cukup untuk animasi walking yang smooth.
        }
    };
}
