import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 全局变量
let scene, camera, renderer, controls;
let points, geometry, material;
let autoRotate = false;
let rotateSpeed = 12;
let lastTime = 0;
let animationId;

// 参数对象
const params = {
    mode: 'spiral',
    count: 5000,
    size: 1.5,
    radius: 200,
    arms: 4,
    spread: 0.6,
    thickness: 2,
    twist: 6,
    radius_exp: 0.6,
    noise_exp: 1.0,
    color_exp: 1.0,
    color_start: '#ff6a00',
    color_end: '#00aaff',
    auto_rotate: 'off',
    rotate_speed: 12,
    seed: 12345,
    clusters: 8,
    clump: 0.35
};

// 预设配置
const presets = {
    spiral: {
        mode: 'spiral',
        count: 8000,
        size: 1.2,
        radius: 250,
        arms: 4,
        spread: 0.4,
        thickness: 1.5,
        twist: 8,
        radius_exp: 0.5,
        noise_exp: 1.2,
        color_exp: 1.2,
        color_start: '#ff6a00',
        color_end: '#8b5cf6',
        clusters: 12,
        clump: 0.4
    },
    sphere: {
        mode: 'sphere',
        count: 6000,
        size: 1.8,
        radius: 180,
        spread: 0.8,
        thickness: 3,
        radius_exp: 0.7,
        noise_exp: 0.8,
        color_exp: 0.8,
        color_start: '#ffffff',
        color_end: '#4a90e2',
        clusters: 6,
        clump: 0.3
    },
    disk: {
        mode: 'disk',
        count: 4000,
        size: 1.0,
        radius: 220,
        spread: 0.3,
        thickness: 0.5,
        radius_exp: 0.4,
        noise_exp: 1.5,
        color_exp: 1.5,
        color_start: '#ff4757',
        color_end: '#3742fa',
        clusters: 4,
        clump: 0.25
    },
    nebula: {
        mode: 'sphere',
        count: 12000,
        size: 2.5,
        radius: 300,
        spread: 1.2,
        thickness: 8,
        radius_exp: 1.2,
        noise_exp: 0.6,
        color_exp: 0.6,
        color_start: '#ff0080',
        color_end: '#8000ff',
        clusters: 20,
        clump: 0.6
    }
};

// 初始化场景
function init() {
    // 创建场景
    scene = new THREE.Scene();
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 300);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 创建控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 800;
    
    // 创建圆形纹理
    const texture = createCircleTexture();
    
    // 创建材质
    material = new THREE.PointsMaterial({
        size: params.size,
        map: texture,
        alphaTest: 0.2,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    // 初始渲染
    renderGalaxy();
    
    // 设置事件监听
    setupEventListeners();
    
    // 开始动画循环
    animate();
}

// 创建圆形纹理
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
}

// 随机数生成器（带种子）
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// 双颜色渐变函数
function colorForDual(t, startHex, endHex, exp) {
    const start = new THREE.Color(startHex);
    const end = new THREE.Color(endHex);
    const tpow = Math.pow(t, Math.max(0.1, exp));
    return {
        r: start.r + (end.r - start.r) * tpow,
        g: start.g + (end.g - start.g) * tpow,
        b: start.b + (end.b - start.b) * tpow
    };
}

// 生成星系
function generateGalaxy() {
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const random = mulberry32(params.seed);
    
    for (let i = 0; i < params.count; i++) {
        let x, y, z, r, t, armAngle;
        
        switch (params.mode) {
            case 'sphere':
                // 球状星系
                const u = random();
                const v = random();
                const theta = 2 * Math.PI * u;
                const phi = Math.acos(2 * v - 1);
                r = Math.pow(random(), params.radius_exp) * params.radius;
                
                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
                
                // 添加噪声
                const noise = (random() - 0.5) * params.spread * r * 0.1;
                x += noise;
                y += noise;
                z += noise;
                break;
                
            case 'spiral':
                // 螺旋星系（不使用随机种子保持清晰螺旋）
                const i2 = i / params.count;
                const baseRadius = i2 * params.radius;
                r = Math.pow(i2, params.radius_exp) * params.radius;
                
                armAngle = (i % params.arms) * (2 * Math.PI / params.arms);
                t = armAngle + (r / params.radius) * params.twist;
                
                // 添加一些随机性但保持螺旋结构
                const spiralRandom = Math.sin(i * 0.1) * 0.5 + 0.5;
                const rr = r + (spiralRandom - 0.5) * params.spread * 30;
                
                x = Math.cos(t) * rr;
                z = Math.sin(t) * rr;
                y = (random() - 0.5) * params.thickness * 5;
                break;
                
            case 'disk':
                // 盘状星系
                const angle = random() * 2 * Math.PI;
                const diskRadius = Math.pow(random(), params.radius_exp) * params.radius;
                
                x = Math.cos(angle) * diskRadius;
                z = Math.sin(angle) * diskRadius;
                y = (random() - 0.5) * params.thickness;
                
                // 添加扩散
                const diskNoise = (random() - 0.5) * params.spread;
                x += diskNoise;
                z += diskNoise;
                break;
        }
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // 颜色计算
        const distance = Math.sqrt(x * x + y * y + z * z) / params.radius;
        const colorT = Math.pow(distance, params.color_exp);
        const color = colorForDual(colorT, params.color_start, params.color_end, 1.0);
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    return { positions, colors };
}

// 渲染星系
function renderGalaxy() {
    // 移除旧的点云
    if (points) {
        scene.remove(points);
        if (geometry) geometry.dispose();
    }
    
    // 生成新的几何体
    geometry = new THREE.BufferGeometry();
    const { positions, colors } = generateGalaxy();
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // 更新材质
    material.size = params.size;
    
    // 创建新的点云
    points = new THREE.Points(geometry, material);
    scene.add(points);
}

// 设置事件监听器
function setupEventListeners() {
    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);
    
    // 控制面板切换
    const toggleHandle = document.getElementById('toggleHandle');
    const controlPanel = document.getElementById('controlPanel');
    const collapseBtn = document.getElementById('collapseBtn');
    
    toggleHandle.addEventListener('click', () => {
        controlPanel.classList.remove('collapsed');
        toggleHandle.classList.add('hidden');
    });
    
    collapseBtn.addEventListener('click', () => {
        controlPanel.classList.add('collapsed');
        toggleHandle.classList.remove('hidden');
    });
    
    // 参数控制
    const controls = [
        'mode', 'count', 'size', 'radius', 'arms', 'spread', 'thickness', 
        'twist', 'radius_exp', 'noise_exp', 'color_exp', 'color_start', 
        'color_end', 'auto_rotate', 'rotate_speed', 'seed', 'clusters', 'clump'
    ];
    
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // 处理不同类型的输入
                if (e.target.type === 'number') {
                    value = parseFloat(value);
                } else if (e.target.type === 'range') {
                    value = parseFloat(value);
                    // 更新显示值
                    const valueDisplay = document.getElementById(id + 'Value');
                    if (valueDisplay) {
                        valueDisplay.textContent = value;
                    }
                }
                
                params[id] = value;
                
                // 特殊处理
                if (id === 'mode') {
                    updateModeSpecificControls(value);
                } else if (id === 'color_start' || id === 'color_end') {
                    updateColorGradient();
                } else if (id === 'auto_rotate') {
                    autoRotate = value === 'on';
                } else if (id === 'rotate_speed') {
                    rotateSpeed = value;
                }
            });
        }
    });
    
    // 重新渲染按钮
    document.getElementById('render_btn').addEventListener('click', renderGalaxy);
    
    // 初始化模式特定控制
    updateModeSpecificControls(params.mode);
    updateColorGradient();
}

// 更新模式特定控制
function updateModeSpecificControls(mode) {
    const armsControl = document.getElementById('armsControl');
    const twistControl = document.getElementById('twistControl');
    
    if (mode === 'spiral') {
        armsControl.style.display = 'block';
        twistControl.style.display = 'block';
    } else {
        armsControl.style.display = 'none';
        twistControl.style.display = 'none';
    }
}

// 更新颜色渐变
function updateColorGradient() {
    const gradient = document.getElementById('colorGradient');
    gradient.style.background = `linear-gradient(to right, ${params.color_start}, ${params.color_end})`;
}

// 窗口大小调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
function animate(currentTime) {
    animationId = requestAnimationFrame(animate);
    
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // 自动旋转
    if (autoRotate && points) {
        points.rotation.y += (rotateSpeed * deltaTime * Math.PI) / 180;
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// 预设功能
window.loadPreset = function(presetName) {
    if (presets[presetName]) {
        const preset = presets[presetName];
        
        // 更新参数
        Object.keys(preset).forEach(key => {
            params[key] = preset[key];
            
            const element = document.getElementById(key);
            if (element) {
                element.value = preset[key];
                
                // 更新显示值
                const valueDisplay = document.getElementById(key + 'Value');
                if (valueDisplay) {
                    valueDisplay.textContent = preset[key];
                }
            }
        });
        
        // 更新特殊控件
        updateModeSpecificControls(params.mode);
        updateColorGradient();
        autoRotate = params.auto_rotate === 'on';
        rotateSpeed = params.rotate_speed;
        
        // 重新渲染
        renderGalaxy();
    }
};

// 随机设置
window.randomizeSettings = function() {
    const random = Math.random;
    
    // 随机化参数（保持合理范围）
    params.count = Math.floor(random() * 45000) + 5000;
    params.size = random() * 3 + 0.5;
    params.radius = random() * 150 + 150;
    params.spread = random() * 1 + 0.5;
    params.thickness = random() * 8 + 2;
    params.radius_exp = random() * 2 + 0.5;
    params.noise_exp = random() * 2.5 + 0.5;
    params.color_exp = random() * 2.5 + 0.5;
    params.seed = Math.floor(random() * 99999) + 1;
    params.clusters = Math.floor(random() * 50) + 10;
    params.clump = random() * 0.8 + 0.2;
    
    if (params.mode === 'spiral') {
        params.arms = Math.floor(random() * 6) + 2;
        params.twist = random() * 10 + 2;
    }
    
    // 随机颜色
    const hue1 = random() * 360;
    const hue2 = (hue1 + random() * 120 + 60) % 360;
    params.color_start = `hsl(${hue1}, 70%, 50%)`;
    params.color_end = `hsl(${hue2}, 70%, 50%)`;
    
    // 更新UI
    const controls = [
        'count', 'size', 'radius', 'spread', 'thickness', 'radius_exp', 
        'noise_exp', 'color_exp', 'seed', 'clusters', 'clump'
    ];
    
    if (params.mode === 'spiral') {
        controls.push('arms', 'twist');
    }
    
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = params[id];
            const valueDisplay = document.getElementById(id + 'Value');
            if (valueDisplay) {
                valueDisplay.textContent = params[id];
            }
        }
    });
    
    // 更新颜色
    document.getElementById('color_start').value = params.color_start;
    document.getElementById('color_end').value = params.color_end;
    updateColorGradient();
    
    // 重新渲染
    renderGalaxy();
};

// 初始化应用
init();