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
            // Buffer posisi 1 frame untuk sinkronisasi dengan trail (setData async)
            this.syncedPosition = null;
            this.syncedRotation = null;

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

            // Ambil posisi baru dari global state (di-update oleh MapComponent)
            const newPos = window.mapConsole?.hiker3DPosition;
            if (!newPos) return;
            const newRot = window.mapConsole?.hiker3DRotation || 0;

            // SINKRONISASI 1-FRAME BUFFER:
            // Saat jumpTo() memicu render, hiker3DPosition sudah update ke P+1
            // tapi trail (setData async via web worker) masih menampilkan P.
            // Dengan memakai syncedPosition (nilai frame sebelumnya), icon dan trail
            // selalu berada di posisi yang sama di setiap render.
            // Ketika setData worker selesai dan trail update ke P+1,
            // syncedPosition sudah di-update ke P+1 → keduanya sinkron.
            const lngLat = this.syncedPosition || newPos;
            const bearing = this.syncedRotation !== null ? this.syncedRotation : newRot;

            // Simpan nilai saat ini untuk digunakan pada render berikutnya
            this.syncedPosition = [...newPos];
            this.syncedRotation = newRot;

            // Dapatkan elevasi terrain di titik model
            let elevation = 0;
            if (this.map.queryTerrainElevation) {
                const terrainElev = this.map.queryTerrainElevation(lngLat) || 0;
                // Gunakan offset minimal karena origin model sudah di-shift ke kaki.
                // Buffer kecil (5m) hanya untuk mencegah kaki menembus terrain pada lereng curam.
                const elevationOffset = 5; // meter
                elevation = terrainElev + elevationOffset;
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

            // Model Transform Matrix (L) — transform chain untuk Mixamo standard Y-up:
            // Aplikasi berurutan (kanan ke kiri dalam perkalian matrix):
            // 1. feetTranslation: geser kaki ke origin di GLTF lokal space
            // 2. rotationX(+PI/2): konversi GLTF Y-up ke MapLibre Z-up (Y→Z, Z→-Y)
            //    Mixamo menghadap -Z → setelah RotationX(+PI/2) menghadap North (+Y MapLibre)
            // 3. rotationZ(-bearing): putar ke arah jalur (di MapLibre world space)
            //    Tanda NEGATIF karena MapLibre bearing searah jarum jam, Three.js berlawanan
            // 4. counterPitch: agar model tampak tegak meski kamera tilt

            const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);

            // Bearing rotation di MapLibre world space (setelah RotationX)
            const rotationZ = new THREE.Matrix4().makeRotationZ(-bearing * Math.PI / 180);

            // COUNTER-PITCH ROTATION: Agar model selalu tampak tegak lurus di layar.
            // pitchAxis = arah "kanan kamera" = (cos(bearing), -sin(bearing), 0)
            // Note: -sin bukan +sin! Untuk bearing=90° (East), kanan kamera = South (-Y).
            const mapBearing = this.map.getBearing() || 0;
            const mapPitch = this.map.getPitch() || 0;
            const mapBearingRad = mapBearing * Math.PI / 180;
            const mapPitchRad = mapPitch * Math.PI / 180;
            const pitchAxis = new THREE.Vector3(Math.cos(mapBearingRad), -Math.sin(mapBearingRad), 0);
            const counterPitch = new THREE.Matrix4().makeRotationAxis(pitchAxis, -mapPitchRad);

            // feetTranslation: geser kaki ke origin dalam GLTF lokal space
            const footOffset = this.modelFootOffset !== undefined ? this.modelFootOffset : 0;
            const feetTranslation = new THREE.Matrix4().makeTranslation(0, footOffset, 0);

            // Chain: T × S × counterPitch × rotationZ × rotationX × feetTranslation
            // Kanan ke kiri: feetTranslation → rotationX → rotationZ → counterPitch → S → T
            const l = new THREE.Matrix4()
                .makeTranslation(mercator.x, mercator.y, mercator.z)
                .scale(new THREE.Vector3(scale, scale, scale))
                .multiply(counterPitch)
                .multiply(rotationZ)
                .multiply(rotationX)
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
